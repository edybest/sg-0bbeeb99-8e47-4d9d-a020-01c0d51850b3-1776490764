import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileNav } from "./MobileNav";
import { MemberTopBarNav } from "./MemberTopBarNav";
import { navLayoutService, type NavigationSettings } from "@/services/navLayoutService";
import { biometricAuthService } from "@/services/biometricAuthService";
import { supabase } from "@/integrations/supabase/client";

const TRUSTED_UNLOCK_SESSION_KEY = "ambc_biometric_unlocked_user";

type MemberLayoutProps = {
  children: ReactNode;
};

type UnlockState = {
  checking: boolean;
  required: boolean;
  verifying: boolean;
  error: string | null;
  username: string;
};

export function MemberLayout({ children }: MemberLayoutProps) {
  const router = useRouter();
  const [navSettings, setNavSettings] = useState<NavigationSettings>(navLayoutService.DEFAULT_NAV_SETTINGS);
  const [unlockState, setUnlockState] = useState<UnlockState>({
    checking: true,
    required: false,
    verifying: false,
    error: null,
    username: "",
  });

  const loadNavigationSettings = useCallback(async () => {
    try {
      const settings = await navLayoutService.getNavigationSettings();
      setNavSettings(settings);
    } catch (loadError) {
      console.error("Error loading navigation settings:", loadError);
    }
  }, []);

  useEffect(() => {
    void loadNavigationSettings();

    const handleNavSettingsUpdate = (event: CustomEvent) => {
      if (event.detail?.settings) {
        setNavSettings(event.detail.settings);
      }
    };

    window.addEventListener("nav-settings-updated", handleNavSettingsUpdate as EventListener);
    return () => {
      window.removeEventListener("nav-settings-updated", handleNavSettingsUpdate as EventListener);
    };
  }, [loadNavigationSettings]);

  useEffect(() => {
    let active = true;

    async function prepareTrustedUnlock() {
      const config = biometricAuthService.getTrustedDeviceConfig();
      if (!config?.enabled) {
        if (active) {
          setUnlockState({ checking: false, required: false, verifying: false, error: null, username: "" });
        }
        return;
      }

      const currentUnlockedUser = typeof window !== "undefined"
        ? sessionStorage.getItem(TRUSTED_UNLOCK_SESSION_KEY)
        : null;

      if (currentUnlockedUser === config.userId) {
        if (active) {
          setUnlockState({ checking: false, required: false, verifying: false, error: null, username: config.username });
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;

      const sessionUserId = data.session?.user?.id;
      if (!sessionUserId || sessionUserId !== config.userId) {
        setUnlockState({ checking: false, required: false, verifying: false, error: null, username: config.username });
        return;
      }

      setUnlockState({
        checking: false,
        required: true,
        verifying: false,
        error: null,
        username: config.username,
      });
    }

    void prepareTrustedUnlock();

    return () => {
      active = false;
    };
  }, []);

  async function handleUseTacFallback() {
    await supabase.auth.signOut();
    await router.push("/login");
  }

  async function handleTrustedUnlock() {
    const config = biometricAuthService.getTrustedDeviceConfig();
    if (!config?.enabled) {
      setUnlockState((prev) => ({
        ...prev,
        checking: false,
        required: false,
        error: "Thumbprint belum diaktifkan pada device ini.",
      }));
      return;
    }

    setUnlockState((prev) => ({ ...prev, verifying: true, error: null }));

    try {
      await biometricAuthService.verifyTrustedDevice(config.userId);
      sessionStorage.setItem(TRUSTED_UNLOCK_SESSION_KEY, config.userId);
      setUnlockState({
        checking: false,
        required: false,
        verifying: false,
        error: null,
        username: config.username,
      });
    } catch (unlockError) {
      const message =
        unlockError instanceof Error
          ? unlockError.message
          : "Pengesahan thumbprint gagal. Anda masih boleh guna WhatsApp TAC.";
      setUnlockState((prev) => ({
        ...prev,
        verifying: false,
        error: message,
      }));
    }
  }

  if (unlockState.checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Menyediakan trusted device unlock...</p>
        </div>
      </div>
    );
  }

  if (unlockState.required) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-foreground">Buka dengan Thumbprint</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Device ini telah ditetapkan sebagai trusted device{unlockState.username ? ` untuk ${unlockState.username}` : ""}. Gunakan thumbprint untuk buka semula member area.
          </p>

          {unlockState.error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {unlockState.error}
            </div>
          )}

          <div className="mt-6 space-y-3">
            <Button onClick={handleTrustedUnlock} disabled={unlockState.verifying} className="h-11 w-full">
              {unlockState.verifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengesahkan Thumbprint...
                </>
              ) : (
                "Guna Thumbprint"
              )}
            </Button>
            <Button variant="outline" onClick={handleUseTacFallback} className="h-11 w-full">
              Guna WhatsApp TAC
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isTopNav = navSettings.position === "top";
  const isBottomNav = navSettings.position === "bottom";
  const isSidebarNav = navSettings.position === "sidebar";
  const mainContentOffsetClass = isTopNav ? "pt-20" : "";

  return (
    <div className="min-h-screen bg-background">
      {isTopNav && (
        <div className={navSettings.isFixed ? "sticky top-0 z-50" : ""}>
          <MemberTopBarNav />
        </div>
      )}

      <div className={isSidebarNav ? "flex" : ""}>
        {isSidebarNav && (
          <aside className={`${navSettings.isFixed ? "sticky top-0" : ""} h-screen w-64 border-r bg-card`}>
            <nav className="flex h-full flex-col gap-2 p-4">
              <div className="text-sm text-muted-foreground">Sidebar Navigation (Coming Soon)</div>
            </nav>
          </aside>
        )}

        <main className={`flex-1 ${mainContentOffsetClass} ${isBottomNav ? "pb-28" : ""} ${isSidebarNav ? "" : "container mx-auto"}`}>
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}