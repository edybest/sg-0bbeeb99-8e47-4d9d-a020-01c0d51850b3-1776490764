import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";

interface ClubLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  skipFetch?: boolean;
}

export function ClubLogo({ size = "md", skipFetch = false }: ClubLogoProps) {
  const [logoData, setLogoData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [useFallback, setUseFallback] = useState(skipFetch);

  const sizeClasses = {
    xs: "h-6 w-6",
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-24 w-24",
    xl: "h-32 w-32",
  };

  useEffect(() => {
    // Skip fetch if explicitly told to or if we're already using fallback
    if (skipFetch || useFallback) {
      return;
    }

    let isMounted = true;
    setLoading(true);

    // Fast timeout - 1 second max
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setUseFallback(true);
        setLoading(false);
      }
    }, 1000);

    async function fetchLogo() {
      try {
        const { data, error: fetchError } = await supabase
          .from("club_settings")
          .select("setting_value")
          .eq("setting_key", "club_logo_base64")
          .single();

        clearTimeout(timeoutId);

        if (!isMounted) return;

        if (fetchError || !data?.setting_value) {
          setUseFallback(true);
          setLoading(false);
          return;
        }

        setLogoData(data.setting_value);
        setLoading(false);
      } catch (err) {
        clearTimeout(timeoutId);
        if (isMounted) {
          setUseFallback(true);
          setLoading(false);
        }
      }
    }

    fetchLogo();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [skipFetch, useFallback]);

  // Show fallback immediately if skipFetch is true or fetch failed
  if (useFallback || loading) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg`}>
        <span className="text-white font-bold text-xs">AMBC</span>
      </div>
    );
  }

  // Show fetched logo if available
  if (logoData) {
    return (
      <div className={`${sizeClasses[size]} relative rounded-full overflow-hidden shadow-lg`}>
        <Image
          src={logoData}
          alt="AMBC Club Logo"
          fill
          className="object-cover"
          onError={() => setUseFallback(true)}
        />
      </div>
    );
  }

  // Final fallback
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg`}>
      <span className="text-white font-bold text-xs">AMBC</span>
    </div>
  );
}