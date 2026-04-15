import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { Loader2 } from "lucide-react";
import { pageAccessService } from "@/services/pageAccessService";

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
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Wait for router to be ready
    if (!router.isReady) return;

    // Prevent multiple simultaneous checks
    if (checkingRef.current) return;
    
    checkAccess();

    // Cleanup
    return () => {
      mountedRef.current = false;
      checkingRef.current = false;
    };
  }, [pagePath, router.isReady, router.query.share]);

  const checkAccess = async () => {
    // Prevent concurrent checks
    if (checkingRef.current) {
      return;
    }

    checkingRef.current = true;

    // Set timeout for fail-open after 2 seconds
    const timeoutId = setTimeout(() => {
      if (!mountedRef.current) return;
      
      console.warn("⏱️ Page access check timeout - allowing access (fail open)");
      checkingRef.current = false;
      setHasAccess(true);
      setLoading(false);
    }, 2000);
    
    try {
      // Bypass access check for public share links
      if (router.pathname === "/member/mini-blok" && router.query.share) {
        clearTimeout(timeoutId);
        setHasAccess(true);
        setLoading(false);
        checkingRef.current = false;
        return;
      }

      // Get user role and check access
      const userRole = await pageAccessService.getUserRole();
      
      if (!mountedRef.current) return;
      
      const accessCheck = await pageAccessService.checkPageAccess(pagePath, userRole);
      
      // Clear timeout since we got a response
      clearTimeout(timeoutId);

      if (!mountedRef.current) return;

      // If page is disabled, redirect to home
      if (!accessCheck.isEnabled) {
        router.push("/");
        return;
      }

      // If no access, redirect based on role
      if (!accessCheck.hasAccess) {
        if (userRole === "guest") {
          router.push("/login");
        } else if (userRole === "member" && accessCheck.accessLevel === "admin") {
          router.push("/member");
        } else {
          router.push("/");
        }
        return;
      }

      // Has access - show page
      setHasAccess(true);
      setLoading(false);
    } catch (error) {
      console.error("❌ Error checking page access:", error);
      clearTimeout(timeoutId);
      
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-sky-600" />
          <p className="text-sky-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null; // Will redirect
  }

  return <>{children}</>;
}