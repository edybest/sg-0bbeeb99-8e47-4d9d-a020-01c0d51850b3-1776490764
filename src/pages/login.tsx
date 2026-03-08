import { SEO } from "@/components/SEO";
import { ClubLogo } from "@/components/ClubLogo";
import { MemberLoginForm } from "@/components/auth/MemberLoginForm";

export default function LoginPage() {
  return (
    <>
      <SEO 
        title="Login - AMBC Club"
        description="Login to AMBC Club member portal"
      />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-gray-50 p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center">
            <ClubLogo size="xl" skipFetch={true} />
          </div>

          {/* Login Form */}
          <MemberLoginForm />
        </div>
      </div>
    </>
  );
}