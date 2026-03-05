import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { MemberLoginForm } from "@/components/auth/MemberLoginForm";
import { SEO } from "@/components/SEO";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Redirect to member dashboard
        router.push("/member");
      }
    });
  }, [router]);

  return (
    <>
      <SEO 
        title="Member Login - AMBC CLUB"
        description="Login sebagai ahli AMBC Bowling Club"
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <MemberLoginForm />
      </div>
    </>
  );
}