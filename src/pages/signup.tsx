import { useEffect } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login - public signup is disabled
    void router.push("/login");
  }, [router]);

  return (
    <>
      <SEO 
        title="Sign Up - AMBC Club"
        description="Sign up for AMBC Club. Contact admin for registration."
      />
      <div className="flex min-h-screen items-center justify-center">
        <p>Redirecting to login...</p>
      </div>
    </>
  );
}