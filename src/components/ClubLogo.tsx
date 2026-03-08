import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";

interface ClubLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
}

export function ClubLogo({ size = "md" }: ClubLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-24 w-24",
    xl: "h-32 w-32",
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchLogo() {
      try {
        const { data, error: fetchError } = await supabase
          .from("club_settings")
          .select("setting_value")
          .eq("setting_key", "club_logo_base64")
          .single();

        if (!isMounted) return;

        if (fetchError || !data?.setting_value) {
          setError(true);
          setLoading(false);
          return;
        }

        setLogoUrl(data.setting_value);
      } catch (err) {
        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchLogo();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-red-500 to-red-700 animate-pulse flex items-center justify-center`}>
        <span className="text-white font-bold text-xs">AMBC</span>
      </div>
    );
  }

  if (error || !logoUrl) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg`}>
        <span className="text-white font-bold text-xs">AMBC</span>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} relative rounded-full overflow-hidden shadow-lg`}>
      <Image
        src={logoUrl}
        alt="AMBC Club Logo"
        fill
        className="object-cover"
        priority
        onError={() => setError(true)}
      />
    </div>
  );
}