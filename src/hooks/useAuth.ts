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
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const isMountedRef = useRef(true);
  const authCheckInProgress = useRef(false);
  
  const subscribe = options?.subscribe ?? true;
  const checkingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const checkAuth = useCallback(async () => {
    // Prevent concurrent checks
    if (checkingRef.current) {
      console.log("⏸️ Auth check already in progress, skipping...");
      return;
    }

    checkingRef.current = true;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set aggressive timeout (3 seconds) for UI release
    timeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      
      console.warn("⏱️ Auth check timeout (5s) - releasing UI lock");
      checkingRef.current = false;
      setLoading(false);
    }, 5000);

    try {
      console.log("🔍 Starting auth check...");
      
      // Use Promise.race to forcefully break out if Supabase Web Locks get stuck
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null }, error: Error }>((resolve) => 
        setTimeout(() => resolve({ data: { session: null }, error: new Error("Auth check timed out due to lock") }), 5000)
      );
      
      const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
      
      // Clear timeout if we got a response
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Check if we're still mounted
      if (!mountedRef.current) {
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
      await loadMemberData(session.user.id, session.user.email ?? null);
    } catch (error) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
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

  async function loadMemberData(userId: string, email: string | null) {
    try {
      console.log("📊 Loading member data for user:", { userId, hasEmail: !!email });

      let memberData = await memberService.getMemberByUserId(userId);

      if (!memberData && email) {
        console.log("🔁 Member not found by user_id, trying email lookup...");
        memberData = await memberService.getMemberByEmail(email);

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

    // Simplify visibility handling to prevent Supabase lock stealing and abort errors
    const handleVisibilityChange = () => {
      if (!mountedRef.current) return;
      
      if (document.visibilityState === "visible") {
        console.log("👁️ Tab became visible - checking auth if needed");
        if (!checkingRef.current && !isAuthenticated) {
          checkAuth();
        }
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
          await loadMemberData(session.user.id, session.user.email ?? null);
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