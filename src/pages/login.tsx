import { SEO } from "@/components/SEO";
import { WhatsAppLoginForm } from "@/components/auth/WhatsAppLoginForm";

export default function LoginPage() {
  return (
    <>
      <SEO 
        title="Login - AMBC Club"
        description="Login to AMBC Club member dashboard"
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* WhatsApp Login Form */}
          <WhatsAppLoginForm />
        </div>
      </div>
    </>
  );
}