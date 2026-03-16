import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { ClubLogo } from "@/components/ClubLogo";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/member/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";
import { LogOut, User, ArrowLeft, Bell } from "lucide-react";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { useEffect, useState } from "react";
import { notificationService } from "@/services/notificationService";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { NotificationInbox } from "@/components/notifications/NotificationInbox";

interface MemberTopBarNavProps {
  title?: string;
  subtitle?: string;
  showMobileNav?: boolean;
  compact?: boolean;
  backTo?: string;
}

export function MemberTopBarNav({
  title = "AMBC CLUB",
  subtitle = "Member",
  showMobileNav = true,
  compact = false,
  backTo,
}: MemberTopBarNavProps) {
  const router = useRouter();
  const { member, logout } = useAuth(false);
  const { withLoading } = useGlobalLoading();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!member) return;

    let mounted = true;

    async function fetchCount() {
      try {
        const count = await notificationService.getUnreadCount();
        if (mounted) setUnreadCount(count);
      } catch (e) {
        console.error("Failed to fetch unread count:", e);
      }
    }

    void fetchCount();

    const handleUpdate = () => void fetchCount();
    window.addEventListener("notifications-updated", handleUpdate);
    return () => {
      mounted = false;
      window.removeEventListener("notifications-updated", handleUpdate);
    };
  }, [member]);

  async function handleLogout() {
    await withLoading("member:topbar:logout", async () => {
      await logout({ redirectTo: "/member" });
    });
  }

  return (
    <header className="bg-theme-header/90 backdrop-blur supports-[backdrop-filter]:bg-theme-header/70 shadow-sm border-b border-border sticky top-0 z-40">
      <div className={`container mx-auto px-4 ${compact ? "py-2" : "py-4"}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {showMobileNav ? <MobileNav compact={compact} /> : null}

            {backTo && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => router.push(backTo)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}

            <Link href="/member" className="flex items-center gap-3 min-w-0">
              <ClubLogo size={compact ? "xs" : "sm"} />
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 min-w-0">
                  <h1 className={`${compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"} font-bold text-red-600 truncate`}>{title}</h1>
                  <span className={`hidden sm:inline ${compact ? "text-xs" : "text-sm"} text-muted-foreground truncate`}>{subtitle}</span>
                </div>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {member ? (
              <>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-full sm:max-w-md p-0 flex flex-col border-l">
                    <div className="sr-only">
                      <SheetTitle>Notifications</SheetTitle>
                      <SheetDescription>View your notifications</SheetDescription>
                    </div>
                    <div className="flex-1 overflow-auto bg-muted/20 p-4">
                      <NotificationInbox />
                    </div>
                  </SheetContent>
                </Sheet>

                <ThemeSwitch />

                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="border-gray-300 hover:bg-gray-100"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </>
            ) : (
              <>
                <ThemeSwitch />
                
                <Button
                  variant="outline"
                  onClick={() => router.push("/login")}
                  className="border-red-600 text-red-600 hover:bg-red-50"
                >
                  <User className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Login</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}