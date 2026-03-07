import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";

interface ClubLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  width?: number;
  height?: number;
  priority?: boolean;
}

export function ClubLogo({ 
  className = "", 
  size,
  width, 
  height,
  priority = false 
}: ClubLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadLogo = async () => {
    try {
      const { data } = await supabase
        .from("club_settings")
        .select("setting_value")
        .eq("setting_key", "club_logo_url")
        .maybeSingle();

      if (data?.setting_value) {
        setLogoUrl(data.setting_value);
      } else {
        // Fallback to default logo
        setLogoUrl("/ambc-logo.png");
      }
    } catch (error) {
      console.error("Error loading logo:", error);
      setLogoUrl("/ambc-logo.png");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogo();

    // Listen for logo updates
    const handleLogoUpdate = (event: any) => {
      const newLogoUrl = event.detail?.logoUrl;
      if (newLogoUrl !== undefined) {
        setLogoUrl(newLogoUrl || "/ambc-logo.png");
      }
    };

    window.addEventListener("logo-updated", handleLogoUpdate);

    return () => {
      window.removeEventListener("logo-updated", handleLogoUpdate);
    };
  }, []);

  let finalWidth = width || 120;
  let finalHeight = height || 120;

  if (size) {
    switch (size) {
      case "sm":
        finalWidth = 40;
        finalHeight = 40;
        break;
      case "md":
        finalWidth = 80;
        finalHeight = 80;
        break;
      case "lg":
        finalWidth = 120;
        finalHeight = 120;
        break;
      case "xl":
        finalWidth = 150;
        finalHeight = 150;
        break;
    }
  }

  if (loading) {
    return (
      <div 
        className={`animate-pulse bg-gray-200 rounded-lg ${className}`}
        style={{ width: finalWidth, height: finalHeight }}
      />
    );
  }

  if (!logoUrl) {
    return (
      <Image
        src="/ambc-logo.png"
        alt="AMBC Club Logo"
        width={finalWidth}
        height={finalHeight}
        priority={priority}
        className={`object-contain ${className}`}
      />
    );
  }

  return (
    <Image
      src={logoUrl}
      alt="Club Logo"
      width={finalWidth}
      height={finalHeight}
      priority={priority}
      className={`object-contain ${className}`}
      onError={() => setLogoUrl("/ambc-logo.png")}
    />
  );
}