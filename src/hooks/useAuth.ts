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

const SESSION_CACHE_KEY = 'ambc_session_cache';
const CACHE_DURATION = 86400000; // 24 hours (1 day) - refresh cache daily for data consistency

function getCachedSession(): CachedSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(SESSION_CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > CACHE_DURATION) {
      // Cache expired, but session might still be valid - let Supabase decide
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function setCachedSession(member: Member) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
      member,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('Failed to cache session:', e);
  }
}

function clearCachedSession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_CACHE_KEY);
  } catch (e) {
    console.warn('Failed to clear session cache:', e);
  }
}

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
  const isMountedRef = useRef(true);
  const authCheckInProgress = useRef(false);
  
  const subscribe = options?.subscribe ?? true;
  const checkingRef = useRef(false);
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

    try {
      console.log("🔍 Starting auth check...");
      
      // Use standard getSession without artificial fast timeout
      // Supabase client already has built-in retry/timeout mechanisms
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      // Check if we're still mounted
      if (!mountedRef.current) {
        return;
      }
      
      if (sessionError) {
        console.error("❌ Session fetch error:", sessionError);
        throw sessionError;
      }

      if (!session) {
        console.log("❌ No session found");
        clearCachedSession();
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
      console.error("❌ Auth check error:", error);
      
      // If there's an error fetching the session, we shouldn't necessarily force logout 
      // if they have a valid cached session, but we will ensure loading state is cleared
      if (mountedRef.current) {
        const cached = getCachedSession();
        if (!cached?.member) {
          clearCachedSession();
          setIsAuthenticated(false);
          if (requireAuth) {
            router.push("/login");
          }
        }
        setLoading(false);
      }
    } finally {
      if (mountedRef.current) {
        checkingRef.current = false;
      }
    }
  }, [requireAuth, requireAdmin, router]);

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
        clearCachedSession();
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

      // Cache the session
      setCachedSession(memberData as Member);

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
      clearCachedSession();
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
    
    // OPTIMISTIC LOADING: Check cache first
    const cached = getCachedSession();
    if (cached?.member) {
      console.log("⚡ Using cached session - instant load");
      setMember(cached.member);
      setIsAuthenticated(true);
      setLoading(false);
      
      // Validate in background (don't block UI)
      setTimeout(() => {
        if (mountedRef.current) {
          checkAuth();
        }
      }, 100);
    } else {
      // No cache - do initial check
      checkAuth();
    }

    // Auth state change listener (simplified - only for sign-in/sign-out)
    let authSubscription: { subscription: { unsubscribe: () => void } } | null = null;

    if (subscribe) {
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mountedRef.current) return;
        
        console.log("🔄 Auth state changed:", event);

        if (event === "SIGNED_IN" && session) {
          await loadMemberData(session.user.id, session.user.email ?? null);
        } else if (event === "SIGNED_OUT") {
          clearCachedSession();
          setMember(null);
          setIsAuthenticated(false);
          setLoading(false);
          if (requireAuth) {
            router.push("/login");
          }
        }
        // Removed TOKEN_REFRESHED handler - no need to reload member data
      });

      authSubscription = listener;
    }

    // Cleanup
    return () => {
      mountedRef.current = false;
      
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
      clearCachedSession();
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