import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { Loader2 } from "lucide-react";
import { pageAccessService } from "@/services/pageAccessService";
import { supabase } from "@/integrations/supabase/client";

interface PageAccessGuardProps {
  children: React.ReactNode;
  pagePath: string;
  requireAuth?: boolean;
  renderLoading?: () => JSX.Element | null;
}

export function PageAccessGuard({
  children,
  pagePath,
  requireAuth = false,
  renderLoading,
}: PageAccessGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const checkingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);
  const emergencyTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    mountedRef.current = true;

    // EMERGENCY BAILOUT: Force release loading after 3 seconds
    emergencyTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && loading) {
        console.error("🚨 EMERGENCY: PageAccessGuard exceeded 3s - forcing access");
        checkingRef.current = false;
        setHasAccess(true);
        setLoading(false);
      }
    }, 3000);

    // Wait for router to be ready
    if (!router.isReady) return;

    // Prevent multiple simultaneous checks
    if (checkingRef.current) return;
    
    checkAccess();

    // Cleanup
    return () => {
      mountedRef.current = false;
      checkingRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (emergencyTimeoutRef.current) {
        clearTimeout(emergencyTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [pagePath, router.isReady, router.query.share]);

  const checkAccess = async () => {
    // Prevent concurrent checks
    if (checkingRef.current) {
      console.log("⏸️ Access check already in progress");
      return;
    }

    // Abort any previous check
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    checkingRef.current = true;
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set aggressive timeout (4 seconds) - shorter than auth timeout
    timeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      console.warn("⏱️ Page access check timeout - allowing access (fail open)");
      checkingRef.current = false;
      setHasAccess(true);
      setLoading(false);
    }, 4000);

    try {
      // Check if this is a public page based on our new settings
      if (pageAccessService.isPublicPage(pagePath)) {
        console.log("🔓 Allowing access to public page:", pagePath);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setHasAccess(true);
        setLoading(false);
        checkingRef.current = false;
        return;
      }

      // Bypass access check for public share links
      if (router.pathname === "/member/mini-blok" && router.query.share) {
        console.log("🔓 Allowing public access to shared Mini Blok");
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setHasAccess(true);
        setLoading(false);
        checkingRef.current = false;
        return;
      }

      // Check if aborted
      if (signal.aborted) {
        console.log("⏸️ Access check aborted");
        return;
      }

      // Get current session with timeout
      const getSessionPromise = supabase.auth.getSession();
      const getSessionTimeout = new Promise<{ data: { session: any }, error: any }>((resolve) => 
        setTimeout(() => {
          console.warn("⏱️ getSession timeout");
          resolve({ data: { session: null }, error: null });
        }, 2000)
      );

      const { data: { session } } = await Promise.race([getSessionPromise, getSessionTimeout]);
      
      // Check if aborted
      if (signal.aborted || !mountedRef.current) {
        console.log("⏸️ Access check aborted after getSession");
        return;
      }

      // If page is not public and user is not logged in, redirect to login
      if (!session) {
        console.log("❌ Access denied (not logged in), redirecting...");
        router.push("/login");
        return;
      }

      // If user is logged in, check specific page permissions
      // First get member info
      const { data: member } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (member) {
        // Admin has access to everything
        if (member.is_admin) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setHasAccess(true);
          setLoading(false);
          return;
        }

        // Check specific page access for regular members
        const accessCheckPromise = pageAccessService.hasPageAccess(member.id, pagePath);
        const accessCheckTimeout = new Promise<boolean>((resolve) => 
          setTimeout(() => {
            console.warn("⏱️ hasPageAccess timeout, allowing access");
            resolve(true);
          }, 2000)
        );

        const hasSpecificAccess = await Promise.race([accessCheckPromise, accessCheckTimeout]);

        if (!hasSpecificAccess) {
          console.log(`❌ Access denied to ${pagePath} for member ${member.id}`);
          router.push("/member"); // Redirect to dashboard which is public
          return;
        }
      }

      // Clear timeout since we got a response
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Has access - show page
      setHasAccess(true);
      setLoading(false);
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === "AbortError") {
        console.log("⏸️ Access check was aborted");
        return;
      }

      console.error("❌ Error checking page access:", error);
      
      // Clear timeout on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // On error, allow access (fail open for better UX)
      if (mountedRef.current) {
        setHasAccess(true);
        setLoading(false);
      }
    } finally {
      if (mountedRef.current) {
        checkingRef.current = false;
      }
    }
  };

  // Show loading state
  if (loading) {
    if (renderLoading) {
      return renderLoading();
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-primary font-medium">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null; // Will redirect
  }

  return <>{children}</>;
}