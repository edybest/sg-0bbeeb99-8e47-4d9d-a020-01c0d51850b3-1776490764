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
const CACHE_DURATION = 31536000000; // 1 year (365 days)

/* ================================
   Cache Helpers
================================ */

function getCachedSession(): CachedSession | null {
    if (typeof window === "undefined") return null;

    try {
        const raw = localStorage.getItem(SESSION_CACHE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as CachedSession;

        if (Date.now() - parsed.timestamp > CACHE_DURATION) {
            localStorage.removeItem(SESSION_CACHE_KEY);
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
        localStorage.setItem(
            SESSION_CACHE_KEY,
            JSON.stringify({
                member,
                timestamp: Date.now(),
            })
        );
    } catch (e) {
        console.warn("Failed to cache session:", e);
    }
}

function clearCachedSession() {
    if (typeof window === "undefined") return;

    try {
        localStorage.removeItem(SESSION_CACHE_KEY);
    } catch (e) {
        console.warn("Failed to clear cache:", e);
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
    const subscribe = options?.subscribe ?? true;

    const mountedRef = useRef(true);
    const checkingRef = useRef(false);
    const loadingMemberRef = useRef(false);

    const [member, setMember] = useState < Member | null > (null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    /* ================================
       Helpers
    ================================ */

    const safeSetState = (data: {
        member?: Member | null;
        loading?: boolean;
        isAuthenticated?: boolean;
    }) => {
        if (!mountedRef.current) return;

        if ("member" in data) setMember(data.member ?? null);
        if ("loading" in data) setLoading(data.loading ?? false);
        if ("isAuthenticated" in data)
            setIsAuthenticated(data.isAuthenticated ?? false);
    };

    const redirectIfNeeded = (path: string) => {
        if (router.pathname !== path) {
            router.push(path);
        }
    };

    /* ================================
       Load Member Data
    ================================ */

    const loadMemberData = useCallback(
        async (userId: string, email: string | null) => {
            if (loadingMemberRef.current) return;
            loadingMemberRef.current = true;

            try {
                console.log("📊 Loading member data:", { userId });

                let memberData = await memberService.getMemberByUserId(userId);

                if (!memberData && email) {
                    console.log("🔁 Trying email fallback...");
                    memberData = await memberService.getMemberByEmail(email);

                    if (memberData && memberData.user_id !== userId) {
                        try {
                            await memberService.linkAuthUser(memberData.id, userId);
                            memberData = { ...memberData, user_id: userId };
                        } catch (err) {
                            console.warn("⚠️ Failed linking user_id:", err);
                        }
                    }
                }

                if (!memberData) {
                    console.error("❌ Member not found");
                    clearCachedSession();

                    safeSetState({
                        member: null,
                        isAuthenticated: false,
                        loading: false,
                    });

                    if (requireAuth) {
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

                if (requireAdmin && !memberData.is_admin) {
                    redirectIfNeeded("/member");
                }
            } catch (error) {
                console.error("❌ loadMemberData error:", error);

                clearCachedSession();

                safeSetState({
                    member: null,
                    isAuthenticated: false,
                    loading: false,
                });

                if (requireAuth) {
                    redirectIfNeeded("/login");
                }
            } finally {
                loadingMemberRef.current = false;
            }
        },
        [requireAuth, requireAdmin, router]
    );

    /* ================================
       Check Auth
    ================================ */

    const checkAuth = useCallback(async () => {
        if (checkingRef.current) {
            console.log("⏸️ Auth check already running...");
            return;
        }

        checkingRef.current = true;

        try {
            console.log("🔍 Checking auth...");

            // Retry once if Supabase temporary failure
            let sessionResult = null;
            let lastError = null;

            for (let i = 0; i < 2; i++) {
                const { data, error } = await supabase.auth.getSession();

                if (!error) {
                    sessionResult = data;
                    break;
                }

                lastError = error;
            }

            if (lastError && !sessionResult) {
                throw lastError;
            }

            const session = sessionResult?.session;

            if (!session) {
                console.log("❌ No session");

                clearCachedSession();

                safeSetState({
                    member: null,
                    isAuthenticated: false,
                    loading: false,
                });

                if (requireAuth) {
                    redirectIfNeeded("/login");
                }

                return;
            }

            await loadMemberData(session.user.id, session.user.email ?? null);
        } catch (error) {
            console.error("❌ checkAuth error:", error);

            const cached = getCachedSession();

            if (!cached?.member) {
                clearCachedSession();

                safeSetState({
                    member: null,
                    isAuthenticated: false,
                    loading: false,
                });

                if (requireAuth) {
                    redirectIfNeeded("/login");
                }
            } else {
                safeSetState({
                    loading: false,
                });
            }
        } finally {
            checkingRef.current = false;
        }
    }, [requireAuth, loadMemberData, router]);

    /* ================================
       Init
    ================================ */

    useEffect(() => {
        mountedRef.current = true;

        const cached = getCachedSession();

        if (cached?.member) {
            console.log("⚡ Using cached session");

            safeSetState({
                member: cached.member,
                isAuthenticated: true,
                loading: false,
            });

            // Delay validation to improve perceived performance
            // Only revalidate after 5 seconds (user already sees content)
            setTimeout(() => {
                if (mountedRef.current) {
                    console.log("📋 Validating cached session in background...");
                    checkAuth();
                }
            }, 5000);
        } else {
            checkAuth();
        }

        // Periodic session refresh - check every 30 minutes
        const refreshInterval = setInterval(() => {
            if (mountedRef.current && isAuthenticated) {
                console.log("⏰ Periodic session check...");
                checkAuth();
            }
        }, 30 * 60 * 1000); // Every 30 minutes

        let authSubscription:
            | { subscription: { unsubscribe: () => void } }
            | null = null;

        if (subscribe) {
            const { data: listener } = supabase.auth.onAuthStateChange(
                async (event, session) => {
                    if (!mountedRef.current) return;

                    console.log("🔄 Auth event:", event);

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

                        if (requireAuth) {
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

            if (authSubscription) {
                authSubscription.subscription.unsubscribe();
            }
        };
    }, [checkAuth, loadMemberData, requireAuth, subscribe]);

    /* ================================
       Logout
    ================================ */

    async function logout(options?: { redirectTo?: string }) {
        try {
            await supabase.auth.signOut();

            clearCachedSession();

            safeSetState({
                member: null,
                isAuthenticated: false,
                loading: false,
            });

            redirectIfNeeded(options?.redirectTo ?? "/login");
        } catch (error) {
            console.error("Logout error:", error);
        }
    }

    /* ================================
       Return
    ================================ */

    return {
        member,
        loading,
        isAuthenticated,
        isAdmin: member?.is_admin || false,
        refetch: checkAuth,
        logout,
    };
}