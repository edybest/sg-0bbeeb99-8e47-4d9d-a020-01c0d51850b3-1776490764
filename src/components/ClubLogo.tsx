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
  const [imageKey, setImageKey] = useState(0);

  const loadLogo = async () => {
    try {
      console.log("ClubLogo: Loading logo from database...");
      
      const { data, error } = await supabase
        .from("club_settings")
        .select("setting_value")
        .eq("setting_key", "club_logo_base64")
        .maybeSingle();

      console.log("ClubLogo: Database query result:", { data, error });

      if (error) {
        console.error("ClubLogo: Error loading logo:", error);
        setLogoBase64("");
      } else if (data?.setting_value) {
        console.log("ClubLogo: Logo loaded, length:", data.setting_value.length);
        setLogoBase64(data.setting_value);
        setImageKey(prev => prev + 1);
      } else {
        console.log("ClubLogo: No logo found in database");
        setLogoBase64("");
      }
    } catch (error) {
      console.error("ClubLogo: Exception loading logo:", error);
      setLogoBase64("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogo();

    const handleLogoUpdate = (event: CustomEvent) => {
      console.log("ClubLogo: Received logo-updated event:", event.detail);
      const newLogoBase64 = event.detail?.logoBase64;
      
      if (newLogoBase64 !== undefined) {
        console.log("ClubLogo: Updating logo from event");
        setLogoBase64(newLogoBase64);
        setImageKey(prev => prev + 1);
      } else {
        console.log("ClubLogo: Reloading logo from database due to event");
        loadLogo();
      }
    };

    window.addEventListener("logo-updated", handleLogoUpdate as EventListener);

    return () => {
      window.removeEventListener("logo-updated", handleLogoUpdate as EventListener);
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
  console.log("ClubLogo: Rendering with imageSrc:", imageSrc.substring(0, 50) + "...");

  return (
    <Image
      key={imageKey}
      src={imageSrc}
      alt="Club Logo"
      width={finalWidth}
      height={finalHeight}
      priority={priority}
      className={`object-contain ${className}`}
      onError={(e) => {
        console.error("ClubLogo: Image failed to load");
        setLogoBase64("");
      }}
      unoptimized={logoBase64.length > 0}
    />
  );
}