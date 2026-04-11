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
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    if (!router.isReady) return;
    
    checkAccess();

    return () => {
      mountedRef.current = false;
    };
  }, [pagePath, router.isReady, router.query.share]);

  const checkAccess = async () => {
    try {
      // 1. Check if this is a public page based on our settings
      if (pageAccessService.isPublicPage(pagePath)) {
        if (mountedRef.current) {
          setHasAccess(true);
          setLoading(false);
        }
        return;
      }

      // 2. Bypass access check for public share links
      if (router.pathname === "/member/mini-blok" && router.query.share) {
        if (mountedRef.current) {
          setHasAccess(true);
          setLoading(false);
        }
        return;
      }

      // 3. For private pages, check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
        return;
      }

      // Allow access for all logged-in users
      if (mountedRef.current) {
        setHasAccess(true);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      // Fail open to avoid locking users out due to network issues
      if (mountedRef.current) {
        setHasAccess(true);
        setLoading(false);
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