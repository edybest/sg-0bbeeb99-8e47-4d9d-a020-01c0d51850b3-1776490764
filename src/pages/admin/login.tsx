import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import { SEO } from "@/components/SEO";

export default function AdminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if already logged in as admin
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Check if user is admin
        const { data: member } = await supabase
          .from("members")
          .select("is_admin")
          .eq("user_id", session.user.id)
          .single();

        if (member?.is_admin) {
          router.push("/admin");
        }
      }
    });
  }, [router]);

  return (
    <>
      <SEO 
        title="Admin Login - AMBC CLUB"
        description="Login panel admin AMBC Bowling Club"
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <AdminLoginForm />
      </div>
    </>
  );
}