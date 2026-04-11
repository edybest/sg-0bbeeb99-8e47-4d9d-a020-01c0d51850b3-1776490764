import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { useEffect } from "react";
import { GlobalLoadingProvider } from "@/contexts/GlobalLoadingContext";
import { GlobalLoadingOverlay } from "@/components/GlobalLoadingOverlay";
import { ScrollToTop } from "@/components/ScrollToTop";
import { SplashScreen } from "@/components/pwa/SplashScreen";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('ServiceWorker registered:', registration);

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available
                  if (confirm('New version available! Reload to update?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            }
          });
        } catch (error) {
          console.error('ServiceWorker registration failed:', error);
        }
      });

      // Handle service worker updates
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // Prevent zoom on double tap (iOS)
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);

    // Add to home screen prompt handling
    let deferredPrompt: any;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      // Store for later use
      (window as any).deferredPrompt = deferredPrompt;
    });

    // Track installation
    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      deferredPrompt = null;
    });
  }, []);

  return (
    <ThemeProvider>
      <GlobalLoadingProvider>
        <SplashScreen />
        <Component {...pageProps} />
        <Toaster />
        <GlobalLoadingOverlay />
        <ScrollToTop />
      </GlobalLoadingProvider>
    </ThemeProvider>
  );
}
