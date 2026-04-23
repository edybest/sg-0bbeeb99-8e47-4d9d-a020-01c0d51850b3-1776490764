import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Info, Shield } from "lucide-react";
import Image from "next/image";

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

export function AdminPwaInstallCard({ className }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const ios = useMemo(() => (mounted ? isIos() : false), [mounted]);
  const standalone = useMemo(() => (mounted ? isInStandaloneMode() : false), [mounted]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.location.pathname.startsWith("/admin")) return;

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
      setDismissed(true);
    } finally {
      setInstalling(false);
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">Install AMBC Admin</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pasang app khas Admin untuk akses lebih pantas ke dashboard.
          </p>
        </div>
        <Shield className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
          <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
            <Image
              src="/ambc-logo.png"
              alt="AMBC Logo"
              width={64}
              height={64}
              className="rounded-lg"
              unoptimized
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">AMBC Admin</p>
            <p className="text-xs text-muted-foreground">Start: /admin/login</p>
          </div>
        </div>

        {deferredPrompt ? (
          <Button onClick={handleInstall} disabled={installing} className="w-full">
            {installing ? "Installing..." : "Install Admin App"}
          </Button>
        ) : ios ? (
          <div className="rounded-lg border bg-background p-3 text-sm text-foreground">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-medium">iPhone/iPad (Safari)</p>
                <p className="text-muted-foreground">
                  Tekan <span className="font-medium">Share</span> →{" "}
                  <span className="font-medium">Add to Home Screen</span>.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">
            Install prompt belum tersedia. Pastikan guna Chrome/Edge dan buka dashboard admin ini dari browser (bukan
            in-app browser).
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={() => setDismissed(true)}>
          Nanti dulu
        </Button>
      </CardContent>
    </Card>
  );
}