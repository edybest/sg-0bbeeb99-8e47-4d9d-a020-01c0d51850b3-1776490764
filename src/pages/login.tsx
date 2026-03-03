import { SEO } from "@/components/SEO";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <>
      <SEO 
        title="Login - AMBC Club"
        description="Login ke sistem keahlian bowling AMBC Club"
      />
      <LoginForm />
    </>
  );
}