import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { sessionService } from "@/services/sessionService";
import type { Database } from "@/integrations/supabase/types";

type Member = Database["public"]["Tables"]["members"]["Row"];
type MemberSession = Database["public"]["Tables"]["member_sessions"]["Row"];

interface AuthState {
  member: Member | null;
  session: MemberSession | null;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook for session-based authentication
 * Usage: const { member, loading, logout } = useAuth();
 */
export function useAuth(requireAuth: boolean = false) {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    member: null,
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch("/api/auth/session");
      const result = await response.json();

      if (response.ok && result.success) {
        setAuthState({
          member: result.data.member,
          session: result.data.session,
          loading: false,
          error: null,
        });
      } else {
        setAuthState({
          member: null,
          session: null,
          loading: false,
          error: result.error || "No session found",
        });

        // Redirect to login if auth is required
        if (requireAuth) {
          router.push("/login");
        }
      }
    } catch (error) {
      setAuthState({
        member: null,
        session: null,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to check session",
      });

      if (requireAuth) {
        router.push("/login");
      }
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      sessionService.clearSessionCookie();
      setAuthState({
        member: null,
        session: null,
        loading: false,
        error: null,
      });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const refreshSession = () => {
    checkSession();
  };

  return {
    member: authState.member,
    session: authState.session,
    loading: authState.loading,
    error: authState.error,
    isAuthenticated: !!authState.member,
    isAdmin: authState.member?.is_admin || false,
    logout,
    refreshSession,
  };
}