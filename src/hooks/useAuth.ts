import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { memberService } from "@/services/memberService";
import type { Tables } from "@/integrations/supabase/types";

type Member = Tables<"members">;

type UseAuthOptions = {
  subscribe?: boolean;
};

/**
 * Custom hook for authentication using Supabase Auth
 * Supports both admin (email/password) and member (WhatsApp OTP) login
 * @param requireAuth - If true, redirects to login page when not authenticated
 * @param requireAdmin - If true, redirects to member page when not admin
 */
export function useAuth(requireAuth = false, requireAdmin = false, options?: UseAuthOptions) {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const subscribe = options?.subscribe ?? true;
  const checkingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  const checkAuth = useCallback(async () => {
    // Prevent concurrent checks
    if (checkingRef.current) {
      console.log("⏸️ Auth check already in progress, skipping...");
      return;
    }

    // Abort any previous pending check
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    checkingRef.current = true;
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set aggressive timeout (5 seconds)
    timeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      
      console.error("⏱️ Auth check timeout (5s) - forcing completion");
      checkingRef.current = false;
      setLoading(false);
      
      if (requireAuth && !isAuthenticated) {
        console.log("🔴 Timeout + requireAuth -> redirecting to login");
        router.push("/login");
      }
    }, 5000);

    try {
      console.log("🔍 Starting auth check...");
      
      // Check if request was aborted
      if (signal.aborted) {
        console.log("⏸️ Auth check aborted");
        return;
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      
      // Clear timeout if we got a response
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Check if we're still mounted and not aborted
      if (!mountedRef.current || signal.aborted) {
        console.log("⏸️ Component unmounted or check aborted");
        return;
      }

      if (error) {
        console.error("❌ Session error:", error);
        setIsAuthenticated(false);
        setLoading(false);
        if (requireAuth) {
          router.push("/login");
        }
        return;
      }

      if (!session) {
        console.log("❌ No session found");
        setIsAuthenticated(false);
        setLoading(false);
        if (requireAuth) {
          router.push("/login");
        }
        return;
      }

      console.log("✅ Session found, loading member data...");
      await loadMemberData(session.user.id, session.user.email ?? null, signal);
    } catch (error) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Ignore abort errors
      if (error instanceof Error && error.name === "AbortError") {
        console.log("⏸️ Auth check was aborted");
        return;
      }
      
      console.error("❌ Auth check error:", error);
      
      if (mountedRef.current) {
        setIsAuthenticated(false);
        setLoading(false);
        if (requireAuth) {
          router.push("/login");
        }
      }
    } finally {
      if (mountedRef.current) {
        checkingRef.current = false;
      }
    }
  }, [requireAuth, requireAdmin, router, isAuthenticated]);

  async function loadMemberData(userId: string, email: string | null, signal: AbortSignal) {
    try {
      if (signal.aborted) return;

      console.log("📊 Loading member data for user:", { userId, hasEmail: !!email });

      let memberData = await memberService.getMemberByUserId(userId);

      if (signal.aborted) return;

      if (!memberData && email) {
        console.log("🔁 Member not found by user_id, trying email lookup...");
        memberData = await memberService.getMemberByEmail(email);

        if (signal.aborted) return;

        if (memberData && memberData.user_id !== userId) {
          console.log("🔗 Linking member.user_id for future sessions...");
          try {
            await memberService.linkAuthUser(memberData.id, userId);
            memberData = { ...memberData, user_id: userId };
          } catch (linkError) {
            console.warn("⚠️ Could not link member.user_id (RLS may block)", linkError);
          }
        }
      }

      if (signal.aborted) return;

      if (!memberData) {
        console.error("❌ Member not found for session user:", { userId, email });
        setIsAuthenticated(false);
        setLoading(false);
        if (requireAuth) {
          router.push("/login");
        }
        return;
      }

      console.log("✅ Member loaded:", {
        id: memberData.id,
        username: memberData.username,
        isAdmin: memberData.is_admin
      });

      if (!mountedRef.current) return;

      setMember(memberData as Member);
      setIsAuthenticated(true);
      setLoading(false);

      // Check admin requirement
      if (requireAdmin && !memberData.is_admin) {
        console.log("⚠️ Admin required but user is not admin, redirecting...");
        router.push("/member");
      }
    } catch (error) {
      console.error("❌ Error loading member data:", error);
      if (mountedRef.current) {
        setIsAuthenticated(false);
        setLoading(false);
        if (requireAuth) {
          router.push("/login");
        }
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    
    // Initial check
    checkAuth();

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (!mountedRef.current) return;
      
      if (document.visibilityState === "visible") {
        console.log("👁️ Tab became visible");
        // Only refresh if not currently checking
        if (!checkingRef.current) {
          checkAuth();
        }
      } else {
        console.log("👁️ Tab became hidden - pausing checks");
        // Abort any ongoing check when tab becomes hidden
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        checkingRef.current = false;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Auth state change listener
    let authSubscription: { subscription: { unsubscribe: () => void } } | null = null;

    if (subscribe) {
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mountedRef.current) return;
        
        console.log("🔄 Auth state changed:", event);

        if (event === "SIGNED_IN" && session) {
          const controller = new AbortController();
          await loadMemberData(session.user.id, session.user.email ?? null, controller.signal);
        } else if (event === "SIGNED_OUT") {
          setMember(null);
          setIsAuthenticated(false);
          setLoading(false);
          if (requireAuth) {
            router.push("/login");
          }
        } else if (event === "TOKEN_REFRESHED") {
          console.log("🔄 Token refreshed successfully");
        }
      });

      authSubscription = listener;
    }

    // Cleanup
    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      if (authSubscription) {
        authSubscription.subscription.unsubscribe();
      }
    };
  }, [checkAuth, requireAuth, subscribe]);

  async function logout(options?: { redirectTo?: string }) {
    try {
      await supabase.auth.signOut();
      setMember(null);
      setIsAuthenticated(false);
      setLoading(false);

      const redirectTo = options?.redirectTo ?? "/login";
      router.push(redirectTo);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  return {
    member,
    loading,
    isAuthenticated,
    isAdmin: member?.is_admin || false,
    refetch: checkAuth,
    logout,
  };
}