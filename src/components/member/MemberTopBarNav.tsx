import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { ClubLogo } from "@/components/ClubLogo";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/member/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";
import { LogOut, User } from "lucide-react";
import { ThemeSwitch } from "@/components/ThemeSwitch";

interface MemberTopBarNavProps {
  title?: string;
  subtitle?: string;
  showMobileNav?: boolean;
  compact?: boolean;
}

export function MemberTopBarNav({
  title = "AMBC CLUB",
  subtitle = "Member",
  showMobileNav = true,
  compact = false,
}: MemberTopBarNavProps) {
  const router = useRouter();
  const { member, logout } = useAuth(false);
  const { withLoading } = useGlobalLoading();

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
                <div className="hidden sm:flex items-center gap-3 rounded-full border border-gray-200 bg-white px-3 py-1.5">
                  {member.avatar_url ? (
                    <Image
                      src={member.avatar_url}
                      alt={member.username || "Member avatar"}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-semibold">
                      {member.username?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {member.full_name || member.username}
                    </div>
                    <div className="text-xs text-gray-500 truncate">@{member.username}</div>
                  </div>
                </div>

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