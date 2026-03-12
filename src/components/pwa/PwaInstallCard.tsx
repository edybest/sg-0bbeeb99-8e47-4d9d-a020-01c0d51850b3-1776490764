import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Info } from "lucide-react";

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
  const [dismissed, setDismissed] = useState(false);

  const ios = useMemo(() => isIos(), []);
  const standalone = useMemo(() => isInStandaloneMode(), []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

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
          <CardTitle className="text-base">Download AMBC App</CardTitle>
          <p className="text-sm text-muted-foreground">
            Install aplikasi untuk akses lebih pantas dari home screen.
          </p>
        </div>
        <Download className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent className="space-y-3">
        {deferredPrompt ? (
          <Button onClick={handleInstall} disabled={installing} className="w-full">
            {installing ? "Installing..." : "Install App"}
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
            Install prompt belum tersedia. Pastikan guna Chrome/Edge dan buka website ini dari browser (bukan in-app
            browser).
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={() => setDismissed(true)}>
          Nanti dulu
        </Button>
      </CardContent>
    </Card>
  );
}