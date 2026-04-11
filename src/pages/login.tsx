import { useEffect } from "react";
import { useRouter } from "next/router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { WhatsAppLoginForm } from "@/components/auth/WhatsAppLoginForm";
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import { useAuth } from "@/hooks/useAuth";
import { ParticleBackground } from "@/components/ParticleBackground";
import { ClubLogo } from "@/components/ClubLogo";
import { SEO } from "@/components/SEO";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, member } = useAuth();

  useEffect(() => {
    if (isAuthenticated && member) {
      if (member.is_admin) {
        void router.push("/admin");
      } else {
        void router.push("/member");
      }
    }
  }, [isAuthenticated, member, router]);

  return (
    <>
      <SEO 
        title="Login - AMBC Club"
        description="Login to AMBC Club member portal. Access your bowling scores, gallery, chat rooms, and more. WhatsApp verification or admin access available."
        keywords={[
          "AMBC login",
          "bowling club login",
          "member portal login",
          "WhatsApp login",
          "bowling member access"
        ]}
      />
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <ParticleBackground />
        
        <div className="relative z-10 w-full max-w-md px-4">
          <div className="mb-8 flex flex-col items-center justify-center space-y-4">
            <ClubLogo size="xl" skipFetch />
            <div className="text-center">
              <h1 className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-4xl font-bold text-transparent">
                AMBC Club
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Bowling Community Portal
              </p>
            </div>
          </div>

          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-lg">
            <CardContent className="pt-6">
              <Tabs defaultValue="whatsapp" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                  <TabsTrigger value="admin">Admin</TabsTrigger>
                </TabsList>
                <TabsContent value="whatsapp">
                  <WhatsAppLoginForm />
                </TabsContent>
                <TabsContent value="admin">
                  <AdminLoginForm />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              New member?{" "}
              <a href="/signup" className="text-primary hover:underline">
                Sign up here
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}