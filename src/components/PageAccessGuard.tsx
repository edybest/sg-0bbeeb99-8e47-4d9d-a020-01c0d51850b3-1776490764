import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";
import { BowlingBallLoader } from "./BowlingBallLoader";

const LOADING_TIMEOUT = 8000; // 8 seconds max loading time

interface PageAccessGuardProps {
  children: React.ReactNode;
  pagePath?: string;
  requireAuth?: boolean;
  renderLoading?: () => React.ReactNode;
}

export function PageAccessGuard({ 
  children, 
  pagePath, 
  requireAuth = true,
  renderLoading 
}: PageAccessGuardProps) {
  const { session, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    if (!loading) {
      setShowTimeoutMessage(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setShowTimeoutMessage(true);
      console.error("Session check timeout - forcing redirect");
      
      // Force redirect to login after timeout if auth is required
      if (requireAuth) {
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    }, LOADING_TIMEOUT);

    return () => clearTimeout(timeoutId);
  }, [loading, router, requireAuth]);

  useEffect(() => {
    if (loading) return;

    const path = router.pathname;

    // Public routes (if pagePath is not provided or explicitly public)
    if (["/", "/login", "/signup"].includes(path) && !requireAuth) {
      if (session) {
        // Redirect authenticated users
        router.push(isAdmin ? "/admin" : "/member");
      }
      return;
    }

    // Protected routes
    if (requireAuth && !session) {
      router.push("/login");
      return;
    }

    // Admin-only routes (simple check based on path)
    if (path.startsWith("/admin") && !isAdmin && session) {
      router.push("/member");
      return;
    }

    // Member-only routes
    if (path.startsWith("/member") && isAdmin && session) {
      router.push("/admin");
      return;
    }
  }, [session, loading, isAdmin, router, requireAuth]);

  if (loading) {
    if (renderLoading) {
      return <>{renderLoading()}</>;
    }
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <BowlingBallLoader />
        <p className="text-white mt-8 text-lg font-semibold animate-pulse">
          {showTimeoutMessage ? "Mengalami masalah sambungan..." : "Checking session..."}
        </p>
        {showTimeoutMessage && (
          <p className="text-gray-300 mt-2 text-sm">
            Anda akan dibawa ke halaman log masuk sebentar lagi...
          </p>
        )}
      </div>
    );
  }

  // If auth is required but no session, don't render children
  // Let the useEffect handle the redirect
  if (requireAuth && !session) {
    return null;
  }

  return <>{children}</>;
}