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

    if (!router.isReady) return;
    if (checkingRef.current) return;
    
    checkAccess();

    return () => {
      mountedRef.current = false;
      checkingRef.current = false;
    };
  }, [pagePath, router.isReady, router.query.share]);

  const checkAccess = async () => {
    if (checkingRef.current) return;

    checkingRef.current = true;

    // Fail-open timeout: 1.5s
    const timeoutId = setTimeout(() => {
      if (!mountedRef.current) return;
      console.warn("⏱️ Page access check timeout - allowing access");
      checkingRef.current = false;
      setHasAccess(true);
      setLoading(false);
    }, 1500);
    
    try {
      // Bypass for public share links
      if (router.pathname === "/member/mini-blok" && router.query.share) {
        clearTimeout(timeoutId);
        setHasAccess(true);
        setLoading(false);
        checkingRef.current = false;
        return;
      }

      const userRole = await pageAccessService.getUserRole();
      
      if (!mountedRef.current) return;
      
      const accessCheck = await pageAccessService.checkPageAccess(pagePath, userRole);
      
      clearTimeout(timeoutId);

      if (!mountedRef.current) return;

      if (!accessCheck.isEnabled) {
        router.push("/");
        return;
      }

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

      setHasAccess(true);
      setLoading(false);
    } catch (error) {
      console.error("❌ Error checking page access:", error);
      clearTimeout(timeoutId);
      
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-sky-600" />
          <p className="text-sky-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}