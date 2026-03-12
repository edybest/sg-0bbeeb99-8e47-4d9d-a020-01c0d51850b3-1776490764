import type { AppProps } from "next/app";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import "@/styles/globals.css";
import { useEffect } from "react";
import { GlobalLoadingProvider } from "@/contexts/GlobalLoadingContext";
import { GlobalLoadingOverlay } from "@/components/GlobalLoadingOverlay";

type AppPageComponent = AppProps["Component"] & {
  disableGlobalLoadingOverlay?: boolean;
};

export default function App({ Component, pageProps }: AppProps) {
  const PageComponent = Component as AppPageComponent;

  useEffect(() => {
    // Register service worker for PWA
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration);
          
          // Check for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // New service worker available, prompt user to reload
                  console.log("New service worker available - reload to update");
                  newWorker.postMessage({ type: "SKIP_WAITING" });
                }
              });
            }
          });

          // Auto-update check every hour
          setInterval(() => {
            registration.update().catch((err) => console.error("SW update check failed:", err));
          }, 60 * 60 * 1000);
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });

      // Listen for controller change (new SW activated)
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  return (
    <GlobalLoadingProvider>
      <ThemeProvider>
        <PageComponent {...pageProps} />
        <Toaster />
        {PageComponent.disableGlobalLoadingOverlay ? null : <GlobalLoadingOverlay />}
      </ThemeProvider>
    </GlobalLoadingProvider>
  );
}
