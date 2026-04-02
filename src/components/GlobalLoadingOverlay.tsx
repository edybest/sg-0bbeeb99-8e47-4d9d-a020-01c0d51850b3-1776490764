"use client";

import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";
import { Loader2 } from "lucide-react";

/**
 * Global loading overlay component
 * Displays bowling ball loader when any global loading operation is active
 * Controlled by GlobalLoadingContext
 */
export function GlobalLoadingOverlay() {
  const { isLoading } = useGlobalLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-16 h-16 animate-spin text-white" />
        <p className="text-white font-medium text-lg">Loading...</p>
      </div>
    </div>
  );
}