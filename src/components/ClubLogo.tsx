import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";

type ClubLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  width?: number;
  height?: number;
  priority?: boolean;
};

export function ClubLogo({
  className = "",
  size,
  width,
  height,
  priority = false,
}: ClubLogoProps) {
  const [logoBase64, setLogoBase64] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadLogo = async () => {
    try {
      const { data } = await supabase
        .from("club_settings")
        .select("setting_value")
        .eq("setting_key", "club_logo_base64")
        .maybeSingle();

      if (data?.setting_value) {
        setLogoBase64(data.setting_value);
      } else {
        setLogoBase64("");
      }
    } catch (error) {
      console.error("Error loading logo:", error);
      setLogoBase64("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogo();

    const handleLogoUpdate = (event: any) => {
      const newLogoBase64 = event.detail?.logoBase64;
      if (newLogoBase64 !== undefined) {
        setLogoBase64(newLogoBase64);
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

  const imageSrc = logoBase64 || "/ambc-logo.png";

  return (
    <Image
      src={imageSrc}
      alt="Club Logo"
      width={finalWidth}
      height={finalHeight}
      priority={priority}
      className={`object-contain ${className}`}
      onError={() => setLogoBase64("")}
    />
  );
}