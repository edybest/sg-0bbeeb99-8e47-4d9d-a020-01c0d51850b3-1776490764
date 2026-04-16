import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";
import { BowlingBallLoader } from "./BowlingBallLoader";

const LOADING_TIMEOUT = 8000; // 8 seconds max loading time

export function PageAccessGuard({ children }: { children: React.ReactNode }) {
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
      
      // Force redirect to login after timeout
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    }, LOADING_TIMEOUT);

    return () => clearTimeout(timeoutId);
  }, [loading, router]);

  useEffect(() => {
    if (loading) return;

    const path = router.pathname;

    // Public routes
    if (["/", "/login", "/signup"].includes(path)) {
      if (session) {
        // Redirect authenticated users
        router.push(isAdmin ? "/admin" : "/member");
      }
      return;
    }

    // Protected routes
    if (!session) {
      router.push("/login");
      return;
    }

    // Admin-only routes
    if (path.startsWith("/admin") && !isAdmin) {
      router.push("/member");
      return;
    }

    // Member-only routes
    if (path.startsWith("/member") && isAdmin) {
      router.push("/admin");
      return;
    }
  }, [session, loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <BowlingBallLoader />
        <p className="text-white mt-8 text-lg font-semibold animate-pulse">
          {showTimeoutMessage ? "Mengalami masalah sambungan..." : "Checking session..."}
        </p>
        {showTimeoutMessage && (
          <p className="text-gray-300 mt-2 text-sm">
            Anda akan dibawa ke halaman login sebentar lagi...
          </p>
        )}
      </div>
    );
  }

  return <>{children}</>;
}