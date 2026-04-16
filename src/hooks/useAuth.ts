import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/authService";
import { Session } from "@supabase/supabase-js";

interface AuthState {
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  memberData: any | null;
}

const SESSION_CHECK_TIMEOUT = 5000; // 5 seconds timeout

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    loading: true,
    isAdmin: false,
    memberData: null,
  });

  const checkSession = useCallback(async () => {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Session check timeout")), SESSION_CHECK_TIMEOUT);
      });

      // Race between session check and timeout
      const { data: { session }, error } = await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise
      ]) as any;

      if (error) {
        console.error("Session check error:", error);
        setAuthState({ session: null, loading: false, isAdmin: false, memberData: null });
        return;
      }

      if (!session) {
        setAuthState({ session: null, loading: false, isAdmin: false, memberData: null });
        return;
      }

      // Check if admin
      const isAdminUser = await authService.isAdmin(session.user.id);

      // Get member data if not admin
      let memberData = null;
      if (!isAdminUser) {
        try {
          const memberDataPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Member data fetch timeout")), 3000);
          });

          // Fix excessive depth error by casting to any early
          const fetchPromise = supabase.from("members").select("*").eq("auth_user_id", session.user.id).single() as any;
          
          const { data: member } = await Promise.race([
            fetchPromise,
            memberDataPromise
          ]) as any;

          memberData = member;
        } catch (err) {
          console.error("Failed to fetch member data:", err);
          // Continue without member data rather than blocking
        }
      }

      setAuthState({
        session,
        loading: false,
        isAdmin: isAdminUser,
        memberData,
      });
    } catch (error) {
      console.error("Failed to check session:", error);
      // On any error, clear session and stop loading to prevent stuck
      setAuthState({ session: null, loading: false, isAdmin: false, memberData: null });
    }
  }, []);

  useEffect(() => {
    // Initial session check with safety timeout
    const initTimeout = setTimeout(() => {
      console.warn("Initial session check taking too long, clearing...");
      setAuthState({ session: null, loading: false, isAdmin: false, memberData: null });
    }, SESSION_CHECK_TIMEOUT + 1000);

    checkSession().finally(() => {
      clearTimeout(initTimeout);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setAuthState({ session: null, loading: false, isAdmin: false, memberData: null });
        return;
      }

      try {
        const isAdminUser = await authService.isAdmin(session.user.id);
        
        let memberData = null;
        if (!isAdminUser) {
          const { data: member } = await supabase
            .from("members")
            .select("*")
            .eq("auth_user_id", session.user.id)
            .single();
          memberData = member;
        }

        setAuthState({
          session,
          loading: false,
          isAdmin: isAdminUser,
          memberData,
        });
      } catch (error) {
        console.error("Error in auth state change:", error);
        setAuthState({ session, loading: false, isAdmin: false, memberData: null });
      }
    });

    return () => {
      clearTimeout(initTimeout);
      subscription.unsubscribe();
    };
  }, [checkSession]);

  const signOut = useCallback(async () => {
    try {
      await authService.signOut();
      setAuthState({ session: null, loading: false, isAdmin: false, memberData: null });
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, []);

  return {
    ...authState,
    member: authState.memberData,
    isAuthenticated: !!authState.session,
    user: authState.session?.user ?? null,
    signOut,
    logout: signOut, // Alias for signOut
    refreshSession: checkSession,
  };
}