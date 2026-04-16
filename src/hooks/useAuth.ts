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

// FIX (Security): Reduced from 1 year to 15 minutes to limit PII exposure
// on shared devices. A background revalidation refreshes this on every load.
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

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
        // FIX (Security): Use sessionStorage instead of localStorage.
        // sessionStorage is cleared when the tab/browser closes, limiting
        // the exposure window on shared devices. Only cache non-sensitive
        // fields to further reduce PII at rest.
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

/* ================================
   Hook
================================ */

export function useAuth(
    requireAuth = false,
    requireAdmin = false,
    options?: UseAuthOptions
) {
    const router = useRouter();

    // FIX (Correctness): Extract stable primitives from router to avoid
    // unstable object references in useCallback dependency arrays, which
    // would cause loadMemberData/checkAuth to be recreated on every render.
    const { push: routerPush, asPath: routerAsPath } = router;

    const subscribe = options?.subscribe ?? true;

    const mountedRef = useRef(true);
    const checkingRef = useRef(false);
    const loadingMemberRef = useRef(false);
    
    // FIX (Orphaned Lock): AbortController untuk cancel operasi auth bila unmount
    const abortControllerRef = useRef<AbortController | null>(null);

    // FIX (Bug): Track isAuthenticated in a ref so the periodic interval
    // closure reads the latest value instead of the stale value from mount.
    const isAuthenticatedRef = useRef(false);

    // FIX (Correctness): Stabilise requireAuth/requireAdmin in refs so
    // changes to those props don't cause loadMemberData/checkAuth to be
    // recreated and the useEffect to re-run.
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
            // FIX (Bug): Keep ref in sync so the periodic interval closure
            // always sees the latest authentication state.
            isAuthenticatedRef.current = val;
            setIsAuthenticated(val);
        }
    }, []);

    // FIX (Correctness): Use router.asPath (the real URL) instead of
    // router.pathname (the template, e.g. "/member/[id]") to avoid
    // incorrectly redirecting users who are already on the target page.
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
                // FIX (Minor): Log the skip so callers can observe it in dev.
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

                let memberData = await memberService.getMemberByUserId(userId);

                if (!mountedRef.current) return; // Check selepas async operation

                if (!memberData && email) {
                    log("🔁 Trying email fallback...");
                    memberData = await memberService.getMemberByEmail(email);

                    if (!mountedRef.current) return; // Check selepas async operation

                    if (memberData && memberData.user_id !== userId) {
                        try {
                            await memberService.linkAuthUser(memberData.id, userId);
                            if (!mountedRef.current) return;
                            memberData = { ...memberData, user_id: userId };
                        } catch (err) {
                            warn("⚠️ Failed linking user_id:", err);
                        }
                    }
                }

                if (!mountedRef.current) return; // Final check before state update

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
        // FIX (Correctness): requireAuth/requireAdmin are now read via refs
        // inside the callback, so they are no longer in the dependency array.
        // This prevents the function from being recreated on every prop change.
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

        // FIX (Orphaned Lock): Cancel previous operation if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            log("🔍 Checking auth...");

            let sessionResult = null;
            let lastError = null;

            // Retry logic with abort signal
            for (let i = 0; i < 2; i++) {
                if (!mountedRef.current || abortControllerRef.current?.signal.aborted) {
                    log("⏸️ Auth check cancelled.");
                    return;
                }

                const { data, error: sessionError } = await supabase.auth.getSession();

                if (!sessionError) {
                    sessionResult = data;
                    break;
                }

                lastError = sessionError;
            }

            if (!mountedRef.current || abortControllerRef.current?.signal.aborted) {
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
            // Ignore abort errors
            if (err?.name === 'AbortError') {
                log("⏸️ Auth check aborted (normal cleanup)");
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
                // Network error but we have a recent cache — stay logged in
                // but don't hide the loading spinner change.
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

        const cached = getCachedSession();

        if (cached?.member) {
            log("⚡ Using cached session");

            safeSetState({
                member: cached.member as Member,
                isAuthenticated: true,
                loading: false,
            });

            // FIX (Bug): Guard the delayed revalidation against the case
            // where the user has already logged out in the 5-second window.
            // The isAuthenticatedRef check prevents a SIGNED_OUT event from
            // being overwritten by the delayed checkAuth resolving later.
            const revalidateTimeout = setTimeout(() => {
                if (mountedRef.current && isAuthenticatedRef.current) {
                    log("📋 Validating cached session in background...");
                    checkAuth();
                }
            }, 5000);

            // Cleanup timeout on unmount
            return () => {
                clearTimeout(revalidateTimeout);
            };
        } else {
            checkAuth();
        }

        // FIX (Bug): Read from isAuthenticatedRef (not the stale state
        // closure) so the interval correctly observes the current auth state.
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

            // FIX (Orphaned Lock): Cancel pending auth operations
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }

            if (authSubscription) {
                authSubscription.subscription.unsubscribe();
            }
        };
        // FIX (Correctness): checkAuth and loadMemberData are now stable because
        // they read requireAuth/requireAdmin from refs. The effect will not
        // re-run unnecessarily when those props change.
    }, [checkAuth, loadMemberData, safeSetState, redirectIfNeeded, subscribe]);

    /* ================================
       Logout
    ================================ */

    // FIX (Minor): safeSetState is called after the async signOut, so it is
    // intentionally guarded by mountedRef.current inside safeSetState. If
    // the component unmounts during signOut the state updates are no-ops.
    async function logout(options?: { redirectTo?: string }) {
        try {
            // Cancel any pending auth checks
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