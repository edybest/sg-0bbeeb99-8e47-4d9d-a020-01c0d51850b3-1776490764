import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppLoginForm } from "@/components/auth/WhatsAppLoginForm";
import { SEO } from "@/components/SEO";

export default function LoginPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log("User already logged in, redirecting to member dashboard");
        router.replace("/member");
        return;
      }
      
      setIsChecking(false);
    } catch (error) {
      console.error("Error checking session:", error);
      setIsChecking(false);
    }
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Checking session...</p>
        </div>
      </div>
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