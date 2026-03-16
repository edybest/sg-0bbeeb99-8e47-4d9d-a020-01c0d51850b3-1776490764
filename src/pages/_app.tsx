import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";
import { GlobalLoadingProvider } from "@/contexts/GlobalLoadingContext";
import { GlobalLoadingOverlay } from "@/components/GlobalLoadingOverlay";
import { SplashScreen } from "@/components/pwa/SplashScreen";
import { SiteFooter } from "@/components/SiteFooter";
import { useRouter } from "next/router";
import { ScrollToTop } from "@/components/ScrollToTop";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [splashComplete, setSplashComplete] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const hasSeenSplash = sessionStorage.getItem("splash_shown");

    if (!isStandalone || hasSeenSplash) {
      setShowSplash(false);
      setSplashComplete(true);
    } else {
      sessionStorage.setItem("splash_shown", "true");
    }
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registered:", registration);

            setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000);

            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (
                    newWorker.state === "installed" &&
                    navigator.serviceWorker.controller
                  ) {
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

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload();
        });
      });
    }
  }, [isMounted]);

  const handleSplashComplete = () => {
    setSplashComplete(true);
  };

  const hideFooter = useState(() => false)[0];

  const shouldHideFooter =
    isMounted &&
    (router.pathname.startsWith("/admin") ||
      router.pathname === "/login" ||
      router.pathname === "/signup" ||
      router.pathname === "/admin/login");

  return (
    <GlobalLoadingProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        storageKey="theme"
      >
        {showSplash && !splashComplete && (
          <SplashScreen onComplete={handleSplashComplete} />
        )}

        {splashComplete && (
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">
              <Component {...pageProps} />
            </div>
            {!shouldHideFooter && <SiteFooter />}
          </div>
        )}

        <Toaster />
        {typeof window === "undefined" ? null : <GlobalLoadingOverlay />}
        <ScrollToTop />
      </ThemeProvider>
    </GlobalLoadingProvider>
  );
}
