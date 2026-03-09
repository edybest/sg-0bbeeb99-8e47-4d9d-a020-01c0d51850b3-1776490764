import { useEffect } from "react";
import { useRouter } from "next/router";
import { WhatsAppLoginForm } from "@/components/auth/WhatsAppLoginForm";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/member");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <>
        <SEO 
          title="Login - AMBC Club"
          description="Login ke AMBC Club member area"
        />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Checking session...</p>
          </div>
        </div>
      </>
    );
  }

  if (isAuthenticated) {
    return (
      <>
        <SEO 
          title="Login - AMBC Club"
          description="Login ke AMBC Club member area"
        />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Redirecting...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO 
        title="Login - AMBC Club"
        description="Login ke AMBC Club member area"
      />
      <WhatsAppLoginForm />
    </>
  );
}