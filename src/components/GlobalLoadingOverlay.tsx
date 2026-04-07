"use client";

import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";
import { Loader2 } from "lucide-react";

/**
 * Global loading overlay component with animated progress bar
 * Displays percentage and smooth progress animation
 * Controlled by GlobalLoadingContext
 */
export function GlobalLoadingOverlay() {
  const { isLoading, progress } = useGlobalLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl min-w-[280px]">
        {/* Spinner */}
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
        
        {/* Loading Text */}
        <p className="text-gray-900 dark:text-white font-semibold text-lg">Loading...</p>
        
        {/* Progress Bar */}
        <div className="w-full space-y-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Percentage Text */}
          <div className="flex justify-center">
            <span className="text-2xl font-bold text-primary tabular-nums">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}