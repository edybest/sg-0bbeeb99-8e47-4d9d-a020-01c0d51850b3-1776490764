import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { pageAccessService } from "@/services/pageAccessService";
import { BowlingBallLoader } from "@/components/BowlingBallLoader";

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

      // Get user role with timeout
      const userRolePromise = pageAccessService.getUserRole();
      const userRoleTimeout = new Promise<"guest">((resolve) => 
        setTimeout(() => {
          console.warn("⏱️ getUserRole timeout, defaulting to guest");
          resolve("guest");
        }, 2000)
      );
      const userRole = await Promise.race([userRolePromise, userRoleTimeout]);
      
      // Check if aborted
      if (signal.aborted || !mountedRef.current) {
        console.log("⏸️ Access check aborted after getUserRole");
        return;
      }
      
      // Check page access with timeout
      const accessCheckPromise = pageAccessService.checkPageAccess(pagePath, userRole);
      const accessCheckTimeout = new Promise<{ hasAccess: boolean; isEnabled: boolean; accessLevel: string }>((resolve) => 
        setTimeout(() => {
          console.warn("⏱️ checkPageAccess timeout, allowing access");
          resolve({ hasAccess: true, isEnabled: true, accessLevel: "public" });
        }, 2000)
      );
      const accessCheck = await Promise.race([accessCheckPromise, accessCheckTimeout]);
      
      // Clear timeout since we got a response
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Check if aborted or unmounted
      if (signal.aborted || !mountedRef.current) {
        console.log("⏸️ Access check aborted after checkPageAccess");
        return;
      }

      console.log("🔐 Page Access Check:", {
        pagePath,
        userRole,
        accessLevel: accessCheck.accessLevel,
        isEnabled: accessCheck.isEnabled,
        hasAccess: accessCheck.hasAccess
      });

      // If page is disabled, redirect to home
      if (!accessCheck.isEnabled) {
        console.log("⛔ Page disabled, redirecting to home");
        router.push("/");
        return;
      }

      // If no access, redirect based on role
      if (!accessCheck.hasAccess) {
        console.log("❌ Access denied, redirecting...");
        
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

  if (loading) {
    if (renderLoading) {
      return renderLoading();
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <BowlingBallLoader />
      </div>
    );
  }

  if (!hasAccess) {
    return null; // Will redirect
  }

  return <>{children}</>;
}