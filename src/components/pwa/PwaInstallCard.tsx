import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIos() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua);
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    // @ts-expect-error - Safari iOS specific
    window.navigator.standalone === true
  );
}

export function PwaInstallCard({ className }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(true); // Default hide until we check client-side
  const [mounted, setMounted] = useState(false);

  const ios = useMemo(() => (mounted ? isIos() : false), [mounted]);
  const standalone = useMemo(() => (mounted ? isInStandaloneMode() : false), [mounted]);

  useEffect(() => {
    setMounted(true);
    // Semak jika pengguna telah menekan dismiss dalam tempoh 24 jam lepas
    const lastDismissed = localStorage.getItem("pwa_prompt_dismissed");
    if (lastDismissed) {
      const timePassed = Date.now() - parseInt(lastDismissed, 10);
      const oneDay = 24 * 60 * 60 * 1000;
      
      if (timePassed < oneDay) {
        setDismissed(true);
      } else {
        // Expired, buang dari localStorage dan tunjuk semula
        localStorage.removeItem("pwa_prompt_dismissed");
        setDismissed(false);
      }
    } else {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!mounted) return null;
  if (standalone || dismissed) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    try {
      setInstalling(true);
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      handleDismiss(); // Sembunyikan selepas proses install
    } catch (err) {
      console.error("PWA Install Error:", err);
    } finally {
      setInstalling(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem("pwa_prompt_dismissed", Date.now().toString());
    setDismissed(true);
  }

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200, delay: 2.5 }} // Delay sikit sebelum popup muncul
          className={`fixed bottom-20 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 sm:w-96 z-[60] ${className || ""}`}
        >
          <Card className="shadow-2xl border-sky-200 bg-white/95 backdrop-blur-md overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3 bg-sky-50/50">
              <div className="space-y-1">
                <CardTitle className="text-base text-sky-800 flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Install App AMBC
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Akses lebih pantas seperti aplikasi sebenar.
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 rounded-full -mt-1 -mr-1 text-slate-400 hover:text-red-500 hover:bg-red-50"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              {deferredPrompt ? (
                <Button 
                  onClick={handleInstall} 
                  disabled={installing} 
                  className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-md"
                >
                  {installing ? "Memasang..." : "Install Sekarang"}
                </Button>
              ) : ios ? (
                <div className="rounded-lg border border-sky-100 bg-sky-50/50 p-3 text-sm">
                  <div className="flex items-start gap-2 text-sky-800">
                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold">Pengguna iPhone/iPad (Safari)</p>
                      <p className="text-sky-700/80">
                        Tekan butang <span className="font-bold border border-sky-200 px-1 rounded bg-white">Share</span> di bawah, kemudian pilih <span className="font-bold border border-sky-200 px-1 rounded bg-white">Add to Home Screen</span>.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
                  Sila guna browser Google Chrome dan pastikan anda tidak membukanya melalui in-app browser (seperti dari dalam Facebook/WhatsApp).
                </div>
              )}

              <Button 
                variant="ghost" 
                className="w-full text-xs text-slate-400 hover:text-slate-600" 
                onClick={handleDismiss}
              >
                Nanti Dulu (Sembunyi 24 Jam)
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}