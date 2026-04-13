import { useEffect } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Immediate redirect to member dashboard
    router.replace("/member");
  }, [router]);

  return (
    <>
      <SEO
        title="AMBC Club - Bowling Club"
        description="Welcome to AMBC Club - Your premier bowling destination"
      />
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-muted-foreground">AMBC...</p>
        </div>
      </div>
    </>
  );
}