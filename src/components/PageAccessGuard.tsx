import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { pageAccessService } from "@/services/pageAccessService";
import { BowlingBallLoader } from "@/components/BowlingBallLoader";

interface PageAccessGuardProps {
  children: React.ReactNode;
  pagePath: string;
  requireAuth?: boolean;
}

export function PageAccessGuard({ children, pagePath, requireAuth = false }: PageAccessGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Wait for router to be ready so query params are available
    if (!router.isReady) return;

    // Prevent multiple simultaneous checks
    if (checking) return;
    
    checkAccess();
  }, [pagePath, router.isReady]); // Only re-run when pagePath changes or router is ready

  const checkAccess = async () => {
    // Prevent concurrent checks
    if (checking) return;
    
    setChecking(true);
    
    try {
      // Bypass access check for public share links
      if (router.pathname === "/member/mini-blok" && router.query.share) {
        console.log("🔓 Allowing public access to shared Mini Blok");
        setHasAccess(true);
        return;
      }

      // Get user role
      const userRole = await pageAccessService.getUserRole();
      
      // Check page access
      const accessCheck = await pageAccessService.checkPageAccess(pagePath, userRole);
      
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
      // On error, allow access (fail open for better UX)
      setHasAccess(true);
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  if (loading) {
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