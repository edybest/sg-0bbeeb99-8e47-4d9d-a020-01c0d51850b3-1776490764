import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Image from "next/image";

interface ClubLogoProps {
  size?: "sm" | "md" | "xl";
  className?: string;
}

export function ClubLogo({ size = "md", className = "" }: ClubLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogo();
  }, []);

  const loadLogo = async () => {
    try {
      // Fetch logo from club_settings table where setting_key is 'logo_base64'
      const { data, error } = await supabase
        .from("club_settings")
        .select("setting_value")
        .eq("setting_key", "logo_base64")
        .maybeSingle(); // Use maybeSingle to avoid 406 error if not found

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.setting_value) {
        setLogoUrl(data.setting_value);
      }
    } catch (error) {
      console.error("Error loading logo:", error);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    xl: "w-32 h-32"
  };

  if (loading) {
    return (
      <div
        className={`${sizeClasses[size]} ${className} rounded-full bg-gray-200 animate-pulse`}
      />
    );
  }

  if (!logoUrl) {
    return (
      <div
        className={`${sizeClasses[size]} ${className} rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold text-xl`}
      >
        AMBC
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} ${className} relative rounded-full overflow-hidden`}>
      <Image
        src={logoUrl}
        alt="Club Logo"
        fill
        className="object-cover"
        priority
      />
    </div>
  );
}