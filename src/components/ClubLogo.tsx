import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2 } from "lucide-react";
import Image from "next/image";

interface ClubLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showFallback?: boolean;
}

export function ClubLogo({ className = "", size = "md", showFallback = true }: ClubLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogo();
  }, []);

  const loadLogo = async () => {
    try {
      const { data, error } = await supabase
        .from("club_settings")
        .select("setting_value")
        .eq("setting_key", "club_logo")
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        setLogoUrl(data.setting_value);
      }
    } catch (error) {
      console.error("Error loading club logo:", error);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-24 h-24",
    xl: "w-32 h-32",
  };

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} ${className} rounded-full bg-muted animate-pulse`} />
    );
  }

  if (logoUrl) {
    return (
      <div className={`${sizeClasses[size]} ${className} relative rounded-full overflow-hidden border-4 border-primary shadow-lg`}>
        <Image
          src={logoUrl}
          alt="AMBC Club Logo"
          fill
          className="object-cover"
          priority
        />
      </div>
    );
  }

  // Fallback icon if no logo uploaded
  if (showFallback) {
    return (
      <div className={`${sizeClasses[size]} ${className} rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary`}>
        <Building2 className="w-1/2 h-1/2 text-primary" />
      </div>
    );
  }

  return null;
}