"use client";

import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";
import { BowlingBallLoaderOverlay } from "./BowlingBallLoader";

/**
 * Global loading overlay component
 * Displays bowling ball loader when any global loading operation is active
 * Controlled by GlobalLoadingContext
 */
export function GlobalLoadingOverlay() {
  const { isLoading } = useGlobalLoading();

  if (!isLoading) {
    return null;
  }

  return <BowlingBallLoaderOverlay />;
}