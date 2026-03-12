import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";
import { GlobalLoadingProvider } from "@/contexts/GlobalLoadingContext";
import { GlobalLoadingOverlay } from "@/components/GlobalLoadingOverlay";
import { SplashScreen } from "@/components/pwa/SplashScreen";

export default function App({ Component, pageProps }: AppProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [splashComplete, setSplashComplete] = useState(false);

  useEffect(() => {
    // Only show splash on first load in standalone mode (PWA)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const hasSeenSplash = sessionStorage.getItem("splash_shown");

    if (!isStandalone || hasSeenSplash) {
      setShowSplash(false);
      setSplashComplete(true);
    } else {
      sessionStorage.setItem("splash_shown", "true");
    }
  }, []);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registered:", registration);

            // Check for updates every hour
            setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000);

            // Listen for updates
            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (
                    newWorker.state === "installed" &&
                    navigator.serviceWorker.controller
                  ) {
                    // New service worker available, prompt update
                    if (
                      confirm(
                        "New version available! Click OK to update and reload."
                      )
                    ) {
                      newWorker.postMessage({ type: "SKIP_WAITING" });
                    }
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.error("Service Worker registration failed:", error);
          });

        // Listen for controller change (new SW activated)
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload();
        });
      });
    }
  }, []);

  const handleSplashComplete = () => {
    setSplashComplete(true);
  };

  return (
    <GlobalLoadingProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {showSplash && !splashComplete && (
          <SplashScreen onComplete={handleSplashComplete} />
        )}
        
        {splashComplete && <Component {...pageProps} />}
        
        <Toaster />
        {typeof window === "undefined" ? null : <GlobalLoadingOverlay />}
      </ThemeProvider>
    </GlobalLoadingProvider>
  );
}
