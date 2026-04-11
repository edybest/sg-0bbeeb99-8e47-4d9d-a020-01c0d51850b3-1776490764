import { useEffect } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    void router.push("/login");
  }, [router]);

  return (
    <>
      <SEO 
        title="AMBC Club - Bowling Community & Member Portal"
        description="Join AMBC Club, the premier bowling community in Malaysia. Access member portal, view gallery, chat with fellow bowlers, track your scores, and participate in events."
        keywords={[
          "AMBC Club",
          "bowling club Malaysia",
          "bowling community",
          "member portal",
          "bowling scores",
          "bowling events",
          "bowling gallery",
          "bowling chat",
          "sports club",
          "bowling training"
        ]}
      />
      <div className="flex min-h-screen items-center justify-center">
        <p>Redirecting...</p>
      </div>
    </>
  );
}