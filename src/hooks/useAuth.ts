import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { memberService } from "@/services/memberService";
import type { Tables } from "@/integrations/supabase/types";

type Member = Tables<"members">;

/**
 * Custom hook for authentication using Supabase Auth
 * Supports both admin (email/password) and member (WhatsApp OTP) login
 * @param requireAuth - If true, redirects to login page when not authenticated
 * @param requireAdmin - If true, redirects to member page when not admin
 */
export function useAuth(requireAuth = false, requireAdmin = false) {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);
      if (event === "SIGNED_IN" && session) {
        await loadMemberData(session.user.id);
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
  }, [requireAuth, requireAdmin]);

  async function checkAuth() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      console.log("🔍 Session check:", { 
        hasSession: !!session, 
        userId: session?.user?.id,
        error: error?.message 
      });

      if (error) {
        console.error("Session error:", error);
        setIsAuthenticated(false);
        if (requireAuth) {
          router.push("/login");
        }
        return;
      }

      if (!session) {
        console.log("❌ No session found");
        setIsAuthenticated(false);
        if (requireAuth) {
          router.push("/login");
        }
        return;
      }

      console.log("✅ Session found, loading member data...");
      await loadMemberData(session.user.id);
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

  async function loadMemberData(userId: string) {
    try {
      console.log("📊 Loading member data for userId:", userId);
      const memberData = await memberService.getMemberByUserId(userId);
      
      if (!memberData) {
        console.error("❌ Member not found for user:", userId);
        setIsAuthenticated(false);
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

      setMember(memberData);
      setIsAuthenticated(true);

      // Check admin requirement
      if (requireAdmin && !memberData.is_admin) {
        console.log("⚠️ Admin required but user is not admin, redirecting...");
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

  async function logout() {
    try {
      await supabase.auth.signOut();
      setMember(null);
      setIsAuthenticated(false);
      router.push("/login");
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