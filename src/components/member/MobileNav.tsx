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
  { href: "/member/five-five", icon: Star, label: "5+5" },
  { href: "/member/couple", icon: Heart, label: "Couple" },
  { href: "/member/average-score", icon: Target, label: "Average" },
];

const secondaryItems: MenuItem[] = [
  { href: "/member/chat", icon: MessageCircle, label: "Chat" },
  { href: "/member/profile", icon: User, label: "Profile" },
  { href: "/member/hall-of-fame", icon: Award, label: "Hall of Fame", shortLabel: "Hall of Fame" },
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
      <nav className="fixed inset-x-0 bottom-4 z-50 px-3 sm:hidden">
        <div className="mx-auto max-w-sm">
          <div className="rounded-[32px] border border-white/70 bg-white/78 px-2.5 py-2 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur-2xl ring-1 ring-slate-200/70">
            <div className="grid grid-cols-6 items-end gap-1">
              {primaryItems.map((item) => {
                const Icon = item.icon;
                const isActive = isRouteActive(router.pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex min-w-0 flex-col items-center justify-end text-center"
                  >
                    <span
                      className={[
                        "flex h-11 w-11 items-center justify-center rounded-[18px] transition-all duration-200",
                        isActive
                          ? "bg-sky-600 text-white shadow-[0_10px_24px_rgba(2,132,199,0.35)]"
                          : "bg-transparent text-slate-500 group-hover:bg-white/80 group-hover:text-sky-700 group-active:scale-95",
                      ].join(" ")}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span
                      className={[
                        "mt-1.5 truncate text-[10px] font-medium leading-none transition-colors duration-200",
                        isActive ? "text-sky-700" : "text-slate-500 group-hover:text-slate-700",
                      ].join(" ")}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}

              <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="group flex min-w-0 flex-col items-center justify-end text-center"
                    aria-label="Buka menu lain"
                  >
                    <span
                      className={[
                        "flex h-11 w-11 items-center justify-center rounded-[18px] transition-all duration-200",
                        isMoreActive || isMoreOpen
                          ? "bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.22)]"
                          : "bg-transparent text-slate-500 group-hover:bg-white/80 group-hover:text-slate-900 group-active:scale-95",
                      ].join(" ")}
                    >
                      <Menu className="h-5 w-5" />
                    </span>
                    <span
                      className={[
                        "mt-1.5 truncate text-[10px] font-medium leading-none transition-colors duration-200",
                        isMoreActive || isMoreOpen ? "text-slate-900" : "text-slate-500 group-hover:text-slate-700",
                      ].join(" ")}
                    >
                      Lagi
                    </span>
                  </button>
                </SheetTrigger>

                <SheetContent
                  side="bottom"
                  className="rounded-t-[32px] border-x border-t border-slate-200/80 bg-white/95 px-0 pb-10 pt-4 backdrop-blur-xl"
                >
                  <SheetHeader className="px-5 pb-3 text-left">
                    <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200" />
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
                                "flex items-center gap-3 rounded-3xl border px-4 py-3.5 transition-all duration-200",
                                isActive
                                  ? "border-sky-200 bg-sky-50 text-sky-800 shadow-sm"
                                  : "border-slate-200/80 bg-white/90 text-slate-700 hover:border-sky-100 hover:bg-slate-50",
                              ].join(" ")}
                            >
                              <div
                                className={[
                                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
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
                      <div className="mt-4 rounded-3xl bg-sky-50 px-4 py-3 text-xs text-sky-800">
                        Anda sedang berada di{" "}
                        <span className="font-semibold">{activeSecondaryItem.label}</span>.
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      <div className="h-[116px] sm:hidden" />
    </>
  );
}