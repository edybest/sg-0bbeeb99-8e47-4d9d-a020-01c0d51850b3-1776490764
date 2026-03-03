import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push("/login");
      return;
    }

    // Check if user is admin
    const { data: member } = await supabase
      .from("members")
      .select("is_admin")
      .eq("user_id", session.user.id)
      .single();

    if (member?.is_admin) {
      router.push("/admin");
    } else {
      router.push("/member");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-950 via-black to-gray-900">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-red-500 mx-auto" />
        <p className="text-gray-400 text-lg">Memuatkan...</p>
      </div>
    </div>
  );
}