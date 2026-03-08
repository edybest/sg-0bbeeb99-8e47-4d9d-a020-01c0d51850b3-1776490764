import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect directly to member dashboard
    router.push("/member");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-950 via-black to-gray-900">
      <div className="text-center space-y-4">
        <p className="text-gray-400 text-lg">Memuatkan...</p>
      </div>
    </div>
  );
}