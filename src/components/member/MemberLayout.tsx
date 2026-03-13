import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MobileNav } from "./MobileNav";
import { MemberTopBarNav } from "./MemberTopBarNav";
import { navLayoutService, type NavigationSettings } from "@/services/navLayoutService";

type MemberLayoutProps = {
  children: ReactNode;
};

export function MemberLayout({ children }: MemberLayoutProps) {
  const router = useRouter();
  const [navSettings, setNavSettings] = useState<NavigationSettings>(navLayoutService.DEFAULT_NAV_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNavigationSettings();

    // Listen for navigation settings updates from admin panel
    const handleNavSettingsUpdate = (event: CustomEvent) => {
      if (event.detail?.settings) {
        setNavSettings(event.detail.settings);
      }
    };

    window.addEventListener("nav-settings-updated", handleNavSettingsUpdate as EventListener);

    return () => {
      window.removeEventListener("nav-settings-updated", handleNavSettingsUpdate as EventListener);
    };
  }, []);

  const loadNavigationSettings = async () => {
    try {
      const settings = await navLayoutService.getNavigationSettings();
      setNavSettings(settings);
    } catch (error) {
      console.error("Error loading navigation settings:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const isTopNav = navSettings.position === "top";
  const isBottomNav = navSettings.position === "bottom";
  const isSidebarNav = navSettings.position === "sidebar";

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      {isTopNav && (
        <div className={navSettings.isFixed ? "sticky top-0 z-50" : ""}>
          <MemberTopBarNav compact={navSettings.isCompact} />
        </div>
      )}

      {/* Main Content Area */}
      <div className={isSidebarNav ? "flex" : ""}>
        {/* Sidebar Navigation */}
        {isSidebarNav && (
          <aside className={`${navSettings.isFixed ? "sticky top-0" : ""} h-screen w-64 border-r bg-card`}>
            <nav className="flex h-full flex-col gap-2 p-4">
              {/* Sidebar nav items - placeholder for now */}
              <div className="text-sm text-muted-foreground">Sidebar Navigation (Coming Soon)</div>
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className={`flex-1 ${isBottomNav ? "pb-20" : ""} ${isSidebarNav ? "" : "container mx-auto"}`}>
          {children}
        </main>
      </div>

      {/* Bottom Navigation */}
      {isBottomNav && (
        <div className={navSettings.isFixed ? "fixed bottom-0 left-0 right-0 z-50" : ""}>
          <MobileNav compact={navSettings.isCompact} />
        </div>
      )}
    </div>
  );
}