import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, X, Chrome, ExternalLink, Smartphone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [browserType, setBrowserType] = useState<"chrome" | "safari" | "whatsapp" | "other">("other");
  const [platform, setPlatform] = useState<"android" | "ios" | "other">("other");

  useEffect(() => {
    // Detect browser and platform
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Detect platform
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform("ios");
    } else if (/android/.test(userAgent)) {
      setPlatform("android");
    }

    // Detect browser type
    if (/whatsapp/.test(userAgent)) {
      setBrowserType("whatsapp");
      setShowInstallPrompt(true); // Show manual instructions for WhatsApp
    } else if (/chrome/.test(userAgent) && !/edge/.test(userAgent)) {
      setBrowserType("chrome");
    } else if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) {
      setBrowserType("safari");
    } else {
      setBrowserType("other");
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for install prompt (Chrome/Edge on Android)
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  }

  function handleDismiss() {
    setShowInstallPrompt(false);
    // Remember dismissal for 7 days
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  }

  function openInBrowser() {
    // Copy current URL to clipboard
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('Link copied! Paste in Chrome/Safari to install.');
    });
  }

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Check if dismissed recently (7 days)
  const dismissed = localStorage.getItem('pwa-install-dismissed');
  if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
    return null;
  }

  // Don't show if no install option available
  if (!showInstallPrompt && !deferredPrompt) {
    return null;
  }

  // WhatsApp specific instructions
  if (browserType === "whatsapp") {
    return (
      <Card className="fixed bottom-4 left-4 right-4 z-50 border-primary shadow-2xl md:left-auto md:right-4 md:w-96">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Install AMBC Club App</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Untuk install app, buka link ini di browser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ExternalLink className="h-4 w-4" />
            <AlertDescription>
              {platform === "android" ? (
                <>
                  <strong>Android:</strong> Tap menu (⋮) → Open in Chrome
                </>
              ) : platform === "ios" ? (
                <>
                  <strong>iOS:</strong> Tap menu → Open in Safari
                </>
              ) : (
                <>
                  Buka link ini di Chrome atau Safari untuk install
                </>
              )}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm font-medium">Langkah-langkah:</p>
            {platform === "android" ? (
              <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                <li>Tap menu WhatsApp (⋮) di atas</li>
                <li>Pilih "Open in Chrome"</li>
                <li>Tap icon "Install" yang muncul</li>
                <li>Confirm installation</li>
              </ol>
            ) : platform === "ios" ? (
              <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                <li>Tap menu WhatsApp di atas</li>
                <li>Pilih "Open in Safari"</li>
                <li>Tap icon Share (⬆️) di bawah</li>
                <li>Scroll dan tap "Add to Home Screen"</li>
                <li>Tap "Add"</li>
              </ol>
            ) : (
              <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                <li>Buka menu WhatsApp</li>
                <li>Pilih "Open in Browser"</li>
                <li>Install dari browser</li>
              </ol>
            )}
          </div>

          <Button onClick={openInBrowser} className="w-full" variant="outline">
            <ExternalLink className="mr-2 h-4 w-4" />
            Copy Link & Open Browser
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Safari/iOS instructions
  if (browserType === "safari" && platform === "ios") {
    return (
      <Card className="fixed bottom-4 left-4 right-4 z-50 border-primary shadow-2xl md:left-auto md:right-4 md:w-96">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Install AMBC Club</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Add app to your home screen for quick access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              <strong>iOS Safari:</strong> Use Share button to install
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm font-medium">Installation Steps:</p>
            <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
              <li>Tap Share button (⬆️) at the bottom</li>
              <li>Scroll down and tap "Add to Home Screen"</li>
              <li>Tap "Add" in the top right</li>
              <li>App icon will appear on your home screen</li>
            </ol>
          </div>

          <Button onClick={handleDismiss} className="w-full" variant="outline">
            Got it!
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Chrome/Android with native install prompt
  if (deferredPrompt) {
    return (
      <Card className="fixed bottom-4 left-4 right-4 z-50 border-primary shadow-2xl md:left-auto md:right-4 md:w-96">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Install AMBC Club</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Install app untuk akses lebih pantas dan boleh offline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">App Benefits:</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✓ Faster loading times</li>
              <li>✓ Works offline</li>
              <li>✓ Home screen icon</li>
              <li>✓ Full-screen experience</li>
              <li>✓ Push notifications</li>
            </ul>
          </div>

          <Button onClick={handleInstallClick} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Install Now
          </Button>

          <Button onClick={handleDismiss} variant="ghost" className="w-full">
            Maybe Later
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}