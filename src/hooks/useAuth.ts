import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { memberService } from "@/services/memberService";
import type { Tables } from "@/integrations/supabase/types";

type Member = Tables<"members">;

type UseAuthOptions = {
    subscribe?: boolean;
};

interface CachedSession {
    member: Member;
    timestamp: number;
}

const SESSION_CACHE_KEY = "ambc_session_cache";

// 15 minutes cache
const CACHE_DURATION = 15 * 60 * 1000; 

const isDev = process.env.NODE_ENV === "development";
const log = (...args: unknown[]) => isDev && console.log(...args);
const warn = (...args: unknown[]) => isDev && console.warn(...args);
const error = (...args: unknown[]) => console.error(...args);

/* ================================
   Cache Helpers
================================ */

function getCachedSession(): CachedSession | null {
    if (typeof window === "undefined") return null;

    try {
        const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as CachedSession;

        if (Date.now() - parsed.timestamp > CACHE_DURATION) {
            sessionStorage.removeItem(SESSION_CACHE_KEY);
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

function setCachedSession(member: Member) {
    if (typeof window === "undefined") return;

    try {
        sessionStorage.setItem(
            SESSION_CACHE_KEY,
            JSON.stringify({
                member: {
                    id: member.id,
                    user_id: member.user_id,
                    is_admin: member.is_admin,
                    full_name: member.full_name,
                    email: member.email,
                    avatar_url: member.avatar_url,
                    phone: member.phone
                },
                timestamp: Date.now(),
            })
        );
    } catch (e) {
        warn("Failed to cache session:", e);
    }
}

function clearCachedSession() {
    if (typeof window === "undefined") return;

    try {
        sessionStorage.removeItem(SESSION_CACHE_KEY);
    } catch (e) {
        warn("Failed to clear cache:", e);
    }
}

// Helper to add timeout to promises to prevent infinite hanging
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallbackValue?: any): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((resolve, reject) => 
            setTimeout(() => {
                if (fallbackValue !== undefined) {
                    resolve(fallbackValue as T);
                } else {
                    reject(new Error(`Operation timed out after ${timeoutMs}ms`));
                }
            }, timeoutMs)
        )
    ]);
}

/* ================================
   Hook
================================ */

export function useAuth(
    requireAuth = false,
    requireAdmin = false,
    options?: UseAuthOptions
) {
    const router = useRouter();

    const { push: routerPush, asPath: routerAsPath } = router;

    const subscribe = options?.subscribe ?? true;

    const mountedRef = useRef(true);
    const checkingRef = useRef(false);
    const loadingMemberRef = useRef(false);
    
    const abortControllerRef = useRef<AbortController | null>(null);

    const isAuthenticatedRef = useRef(false);

    const requireAuthRef = useRef(requireAuth);
    const requireAdminRef = useRef(requireAdmin);

    useEffect(() => {
        requireAuthRef.current = requireAuth;
    }, [requireAuth]);

    useEffect(() => {
        requireAdminRef.current = requireAdmin;
    }, [requireAdmin]);

    const [member, setMember] = useState<Member | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    /* ================================
       Helpers
    ================================ */

    const safeSetState = useCallback((data: {
        member?: Member | null;
        loading?: boolean;
        isAuthenticated?: boolean;
    }) => {
        if (!mountedRef.current) return;

        if ("member" in data) setMember(data.member ?? null);
        if ("loading" in data) setLoading(data.loading ?? false);
        if ("isAuthenticated" in data) {
            const val = data.isAuthenticated ?? false;
            isAuthenticatedRef.current = val;
            setIsAuthenticated(val);
        }
    }, []);

    const redirectIfNeeded = useCallback((path: string) => {
        if (routerAsPath !== path) {
            routerPush(path);
        }
    }, [routerPush, routerAsPath]);

    /* ================================
       Load Member Data
    ================================ */

    const loadMemberData = useCallback(
        async (userId: string, email: string | null) => {
            if (loadingMemberRef.current) {
                log("⏸️ loadMemberData already running, skipping.");
                return;
            }
            
            if (!mountedRef.current) {
                log("⏸️ Component unmounted, skipping loadMemberData.");
                return;
            }
            
            loadingMemberRef.current = true;

            try {
                log("📊 Loading member data:", { userId });

                let memberData = await withTimeout(
                    memberService.getMemberByUserId(userId),
                    5000 // 5 second timeout for member fetch
                );

                if (!mountedRef.current) return;

                if (!memberData && email) {
                    log("🔁 Trying email fallback...");
                    memberData = await withTimeout(
                        memberService.getMemberByEmail(email),
                        5000
                    );

                    if (!mountedRef.current) return;

                    if (memberData && memberData.user_id !== userId) {
                        try {
                            await withTimeout(
                                memberService.linkAuthUser(memberData.id, userId),
                                3000
                            );
                            if (!mountedRef.current) return;
                            memberData = { ...memberData, user_id: userId };
                        } catch (err) {
                            warn("⚠️ Failed linking user_id:", err);
                        }
                    }
                }

                if (!mountedRef.current) return;

                if (!memberData) {
                    error("❌ Member not found for userId:", userId);
                    clearCachedSession();

                    safeSetState({
                        member: null,
                        isAuthenticated: false,
                        loading: false,
                    });

                    if (requireAuthRef.current) {
                        redirectIfNeeded("/login");
                    }

                    return;
                }

                setCachedSession(memberData as Member);

                safeSetState({
                    member: memberData as Member,
                    isAuthenticated: true,
                    loading: false,
                });

                if (requireAdminRef.current && !memberData.is_admin) {
                    redirectIfNeeded("/member");
                }
            } catch (err) {
                error("❌ loadMemberData error:", err);

                if (!mountedRef.current) return;

                clearCachedSession();

                safeSetState({
                    member: null,
                    isAuthenticated: false,
                    loading: false,
                });

                if (requireAuthRef.current) {
                    redirectIfNeeded("/login");
                }
            } finally {
                loadingMemberRef.current = false;
            }
        },
        [safeSetState, redirectIfNeeded]
    );

    /* ================================
       Check Auth
    ================================ */

    const checkAuth = useCallback(async () => {
        if (checkingRef.current) {
            log("⏸️ Auth check already running...");
            return;
        }

        if (!mountedRef.current) {
            log("⏸️ Component unmounted, skipping checkAuth.");
            return;
        }

        checkingRef.current = true;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            log("🔍 Checking auth...");

            let sessionResult = null;
            let lastError = null;

            for (let i = 0; i < 2; i++) {
                if (!mountedRef.current || abortControllerRef.current?.signal.aborted) {
                    log("⏸️ Auth check cancelled.");
                    safeSetState({ loading: false }); // CRITICAL FIX: Ensure loading is cleared on abort
                    return;
                }

                const { data, error: sessionError } = await withTimeout(
                    supabase.auth.getSession(),
                    5000, // 5 seconds max per attempt
                    { data: { session: null }, error: new Error("Session timeout") }
                ) as any;

                if (!sessionError) {
                    sessionResult = data;
                    break;
                }

                lastError = sessionError;
            }

            if (!mountedRef.current || abortControllerRef.current?.signal.aborted) {
                safeSetState({ loading: false });
                return;
            }

            if (lastError && !sessionResult) {
                throw lastError;
            }

            const session = sessionResult?.session;

            if (!session) {
                log("❌ No active session");

                clearCachedSession();

                safeSetState({
                    member: null,
                    isAuthenticated: false,
                    loading: false,
                });

                if (requireAuthRef.current) {
                    redirectIfNeeded("/login");
                }

                return;
            }

            await loadMemberData(session.user.id, session.user.email ?? null);
        } catch (err: any) {
            if (err?.name === 'AbortError') {
                log("⏸️ Auth check aborted (normal cleanup)");
                safeSetState({ loading: false });
                return;
            }

            error("❌ checkAuth error:", err);

            if (!mountedRef.current) return;

            const cached = getCachedSession();

            if (!cached?.member) {
                clearCachedSession();

                safeSetState({
                    member: null,
                    isAuthenticated: false,
                    loading: false,
                });

                if (requireAuthRef.current) {
                    redirectIfNeeded("/login");
                }
            } else {
                safeSetState({ loading: false });
            }
        } finally {
            checkingRef.current = false;
            abortControllerRef.current = null;
        }
    }, [safeSetState, redirectIfNeeded, loadMemberData]);

    /* ================================
       Init
    ================================ */

    useEffect(() => {
        mountedRef.current = true;

        // CRITICAL FIX: Global Safety Timeout to absolutely prevent infinite loading
        const safetyTimeout = setTimeout(() => {
            if (mountedRef.current) {
                warn("⚠️ Global Safety Timeout triggered! Forcing loading state to false.");
                safeSetState({ loading: false });
            }
        }, 8000); // Max 8 seconds of loading ever

        const cached = getCachedSession();

        if (cached?.member) {
            log("⚡ Using cached session");

            safeSetState({
                member: cached.member as Member,
                isAuthenticated: true,
                loading: false,
            });

            const revalidateTimeout = setTimeout(() => {
                if (mountedRef.current && isAuthenticatedRef.current) {
                    log("📋 Validating cached session in background...");
                    checkAuth();
                }
            }, 5000);

            return () => {
                clearTimeout(revalidateTimeout);
                clearTimeout(safetyTimeout);
            };
        } else {
            checkAuth();
        }

        const refreshInterval = setInterval(() => {
            if (mountedRef.current && isAuthenticatedRef.current) {
                log("⏰ Periodic session check...");
                checkAuth();
            }
        }, 30 * 60 * 1000);

        let authSubscription: { subscription: { unsubscribe: () => void } } | null = null;

        if (subscribe) {
            const { data: listener } = supabase.auth.onAuthStateChange(
                async (event, session) => {
                    if (!mountedRef.current) return;

                    log("🔄 Auth event:", event);

                    if (event === "SIGNED_IN" && session) {
                        await loadMemberData(
                            session.user.id,
                            session.user.email ?? null
                        );
                    }

                    if (event === "SIGNED_OUT") {
                        clearCachedSession();

                        safeSetState({
                            member: null,
                            isAuthenticated: false,
                            loading: false,
                        });

                        if (requireAuthRef.current) {
                            redirectIfNeeded("/login");
                        }
                    }
                }
            );

            authSubscription = listener;
        }

        return () => {
            mountedRef.current = false;
            clearInterval(refreshInterval);
            clearTimeout(safetyTimeout);

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }

            if (authSubscription) {
                authSubscription.subscription.unsubscribe();
            }
        };
    }, [checkAuth, loadMemberData, safeSetState, redirectIfNeeded, subscribe]);

    /* ================================
       Logout
    ================================ */

    async function logout(options?: { redirectTo?: string }) {
        try {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }

            await supabase.auth.signOut();

            clearCachedSession();

            safeSetState({
                member: null,
                isAuthenticated: false,
                loading: false,
            });

            redirectIfNeeded(options?.redirectTo ?? "/login");
        } catch (err) {
            error("Logout error:", err);
        }
    }

    /* ================================
       Return
    ================================ */

    return {
        member,
        loading,
        isAuthenticated,
        isAdmin: member?.is_admin ?? false,
        refetch: checkAuth,
        logout,
    };
}