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
        })
        .catch((error) => {
          console.log("Service Worker registration failed:", error);
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
