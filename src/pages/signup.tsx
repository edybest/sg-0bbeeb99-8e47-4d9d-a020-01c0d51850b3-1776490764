import { SEO } from "@/components/SEO";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <>
      <SEO 
        title="Sign Up - Join AMBC Club"
        description="Join AMBC Club bowling community today! Register with your WhatsApp number and become part of Malaysia's premier bowling club. Access member benefits, events, and more."
        keywords={[
          "AMBC signup",
          "join bowling club",
          "bowling club registration",
          "AMBC membership",
          "bowling community Malaysia"
        ]}
      />
      <SignupForm />
    </>
  );
}