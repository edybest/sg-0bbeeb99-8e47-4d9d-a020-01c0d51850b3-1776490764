import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  ChevronRight,
  Gamepad2,
  Heart,
  Home,
  Image,
  MapPin,
  Menu,
  MessageCircle,
  MessageSquare,
  Shuffle,
  Star,
  Target,
  Trophy,
  User,
  Award,
  TrendingUp,
  Dices,
} from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type MenuItem = {
  href: string;
  icon: typeof Home;
  label: string;
  shortLabel?: string;
};

const primaryItems: MenuItem[] = [
  { href: "/member", icon: Home, label: "Home" },
  { href: "/member/blok", icon: Trophy, label: "Blok" },
  { href: "/member/couple", icon: Heart, label: "Couple" },
  { href: "/member/chat", icon: MessageCircle, label: "Chat" },
  { href: "/member/profile", icon: User, label: "Profile" },
];

const secondaryItems: MenuItem[] = [
  { href: "/member/five-five", icon: Star, label: "5+5" },
  { href: "/member/hall-of-fame", icon: Award, label: "Hall of Fame", shortLabel: "Hall of Fame" },
  { href: "/member/average-score", icon: Target, label: "Average" },
  { href: "/member/undi-lane", icon: Dices, label: "Lane Draw" },
  { href: "/member/lane", icon: MapPin, label: "Lane" },
  { href: "/member/mini-blok", icon: Gamepad2, label: "Mini Blok", shortLabel: "Mini" },
  { href: "/member/training", icon: TrendingUp, label: "Training", shortLabel: "Train" },
  { href: "/member/gallery", icon: Image, label: "Gallery" },
  { href: "/member/feedback", icon: MessageSquare, label: "Feedback" },
  { href: "/member/undi-trio", icon: Shuffle, label: "Undi Trio", shortLabel: "Trio Draw" },
];

function isRouteActive(pathname: string, href: string) {
  return pathname === href;
}

export function MobileNav() {
  const router = useRouter();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const activeSecondaryItem = useMemo(
    () => secondaryItems.find((item) => isRouteActive(router.pathname, item.href)) ?? null,
    [router.pathname]
  );

  const isMoreActive = !!activeSecondaryItem;

  return (
    <>
      <nav className="fixed bottom-3 left-3 right-3 z-50 sm:hidden">
        <div className="rounded-[28px] border border-sky-100/80 bg-white/95 px-2 py-2 shadow-[0_14px_40px_rgba(14,116,144,0.18)] backdrop-blur-xl">
          <div className="grid grid-cols-6 gap-1">
            {primaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = isRouteActive(router.pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex min-w-0 flex-col items-center justify-center rounded-2xl px-1 py-2.5 text-center transition-all duration-200",
                    isActive
                      ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                      : "text-slate-600 hover:bg-sky-50 hover:text-sky-700 active:scale-95",
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5" />
                  <span className="mt-1 truncate text-[10px] font-medium leading-none">
                    {item.label}
                  </span>
                </Link>
              );
            })}

            <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className={[
                    "flex min-w-0 flex-col items-center justify-center rounded-2xl px-1 py-2.5 text-center transition-all duration-200",
                    isMoreActive
                      ? "bg-sky-100 text-sky-800 ring-1 ring-sky-200"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95",
                  ].join(" ")}
                  aria-label="Buka menu lain"
                >
                  <Menu className="h-5 w-5" />
                  <span className="mt-1 truncate text-[10px] font-medium leading-none">
                    Lagi
                  </span>
                </button>
              </SheetTrigger>

              <SheetContent side="bottom" className="rounded-t-[28px] px-0 pb-8 pt-4">
                <SheetHeader className="px-5 pb-3 text-left">
                  <SheetTitle className="text-base font-semibold text-slate-900">
                    Menu lain
                  </SheetTitle>
                </SheetHeader>

                <div className="px-4">
                  <div className="grid grid-cols-2 gap-3">
                    {secondaryItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = isRouteActive(router.pathname, item.href);

                      return (
                        <SheetClose asChild key={item.href}>
                          <Link
                            href={item.href}
                            className={[
                              "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-200",
                              isActive
                                ? "border-sky-200 bg-sky-50 text-sky-800"
                                : "border-slate-200 bg-white text-slate-700 hover:border-sky-100 hover:bg-slate-50",
                            ].join(" ")}
                          >
                            <div
                              className={[
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                isActive ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700",
                              ].join(" ")}
                            >
                              <Icon className="h-5 w-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {item.shortLabel ?? item.label}
                              </p>
                              <p className="text-xs text-slate-500">Buka halaman</p>
                            </div>

                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                          </Link>
                        </SheetClose>
                      );
                    })}
                  </div>

                  {activeSecondaryItem && (
                    <div className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-xs text-sky-800">
                      Anda sedang berada di <span className="font-semibold">{activeSecondaryItem.label}</span>.
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <div className="h-[92px] sm:hidden" />
    </>
  );
}