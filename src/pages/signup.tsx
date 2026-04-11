import { SEO } from "@/components/SEO";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <>
      <SEO 
        title="Daftar - AMBC Club"
        description="Daftar sebagai ahli bowling AMBC Club"
      />
      <SignupForm />
    </>
  );
}