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
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Wait for router to be ready so query params are available
    if (!router.isReady) return;

    // Prevent multiple simultaneous checks
    if (checkingRef.current) return;
    
    checkAccess();

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pagePath, router.isReady, router.query.share]);

  const checkAccess = async () => {
    // Prevent concurrent checks
    if (checkingRef.current) {
      console.log("⏸️ Access check already in progress");
      return;
    }
    
    checkingRef.current = true;

    // Set timeout to prevent hanging forever (8 seconds)
    timeoutRef.current = setTimeout(() => {
      console.error("⏱️ Page access check timeout - allowing access (fail open)");
      setHasAccess(true);
      setLoading(false);
      checkingRef.current = false;
    }, 8000);
    
    try {
      // Bypass access check for public share links
      if (router.pathname === "/member/mini-blok" && router.query.share) {
        console.log("🔓 Allowing public access to shared Mini Blok");
        clearTimeout(timeoutRef.current);
        setHasAccess(true);
        setLoading(false);
        checkingRef.current = false;
        return;
      }

      // Get user role with timeout
      const userRole = await Promise.race([
        pageAccessService.getUserRole(),
        new Promise<"guest">((resolve) => 
          setTimeout(() => {
            console.warn("⏱️ getUserRole timeout, defaulting to guest");
            resolve("guest");
          }, 5000)
        )
      ]);
      
      // Check page access with timeout
      const accessCheck = await Promise.race([
        pageAccessService.checkPageAccess(pagePath, userRole),
        new Promise<{ hasAccess: boolean; isEnabled: boolean; accessLevel: string }>((resolve) => 
          setTimeout(() => {
            console.warn("⏱️ checkPageAccess timeout, allowing access");
            resolve({ hasAccess: true, isEnabled: true, accessLevel: "public" });
          }, 5000)
        )
      ]);
      
      // Clear timeout since we got a response
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
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
          // Guest trying to access member/admin page -> redirect to login
          router.push("/login");
        } else if (userRole === "member" && accessCheck.accessLevel === "admin") {
          // Member trying to access admin page -> redirect to member dashboard
          router.push("/member");
        } else {
          // Other cases -> redirect to home
          router.push("/");
        }
        return;
      }

      // Has access - show page
      setHasAccess(true);
    } catch (error) {
      console.error("Error checking page access:", error);
      // Clear timeout on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // On error, allow access (fail open for better UX)
      setHasAccess(true);
    } finally {
      setLoading(false);
      checkingRef.current = false;
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