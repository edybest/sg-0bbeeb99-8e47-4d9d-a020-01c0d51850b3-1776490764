import { useState, useEffect } from "react";
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

  useEffect(() => {
    checkAuth();

    if (!subscribe) {
      return;
    }

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (process.env.NODE_ENV !== "production") {
        console.log("Auth state changed:", event);
      }

      if (event === "SIGNED_IN" && session) {
        await loadMemberData(session.user.id, session.user.email ?? null);
      } else if (event === "SIGNED_OUT") {
        setMember(null);
        setIsAuthenticated(false);
        if (requireAuth) {
          router.push("/login");
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [requireAuth, requireAdmin, subscribe]);

  async function checkAuth() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (process.env.NODE_ENV !== "production") {
        console.log("🔍 Session check:", { 
          hasSession: !!session, 
          userId: session?.user?.id,
          error: error?.message 
        });
      }

      if (error) {
        console.error("Session error:", error);
        setIsAuthenticated(false);
        if (requireAuth) {
          router.push("/login");
        }
        return;
      }

      if (!session) {
        if (process.env.NODE_ENV !== "production") {
          console.log("❌ No session found");
        }
        setIsAuthenticated(false);
        if (requireAuth) {
          router.push("/login");
        }
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        console.log("✅ Session found, loading member data...");
      }
      await loadMemberData(session.user.id, session.user.email ?? null);
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAuthenticated(false);
      if (requireAuth) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadMemberData(userId: string, email: string | null) {
    try {
      if (process.env.NODE_ENV !== "production") {
        console.log("📊 Loading member data for user:", { userId, hasEmail: !!email });
      }

      let memberData = await memberService.getMemberByUserId(userId);

      if (!memberData && email) {
        if (process.env.NODE_ENV !== "production") {
          console.log("🔁 Member not found by user_id, trying email lookup...");
        }
        memberData = await memberService.getMemberByEmail(email);

        if (memberData && memberData.user_id !== userId) {
          if (process.env.NODE_ENV !== "production") {
            console.log("🔗 Linking member.user_id for future sessions...", {
              memberId: memberData.id,
              prevUserId: memberData.user_id,
              newUserId: userId
            });
          }

          try {
            await memberService.linkAuthUser(memberData.id, userId);
            memberData = { ...memberData, user_id: userId };
          } catch (linkError) {
            console.warn("⚠️ Could not link member.user_id (RLS may block). Continuing anyway.", linkError);
          }
        }
      }

      if (!memberData) {
        console.error("❌ Member not found for session user:", { userId, email });
        setIsAuthenticated(false);
        if (requireAuth) {
          router.push("/login");
        }
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        console.log("✅ Member loaded:", {
          id: memberData.id,
          username: memberData.username,
          isAdmin: memberData.is_admin
        });
      }

      setMember(memberData as Member);
      setIsAuthenticated(true);

      // Check admin requirement
      if (requireAdmin && !memberData.is_admin) {
        if (process.env.NODE_ENV !== "production") {
          console.log("⚠️ Admin required but user is not admin, redirecting...");
        }
        router.push("/member");
      }
    } catch (error) {
      console.error("Error loading member data:", error);
      setIsAuthenticated(false);
      if (requireAuth) {
        router.push("/login");
      }
    }
  }

  async function logout(options?: { redirectTo?: string }) {
    try {
      await supabase.auth.signOut();
      setMember(null);
      setIsAuthenticated(false);

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