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

type MenuGroup = {
  title: string;
  items: (MenuItem & { color: string; bg: string })[];
};

const menuGroups: MenuGroup[] = [
  {
    title: "Peribadi & Prestasi",
    items: [
      { href: "/member/profile", icon: User, label: "Profile", color: "text-blue-600", bg: "bg-blue-100/50" },
      { href: "/member/chat", icon: MessageCircle, label: "Chat", color: "text-green-600", bg: "bg-green-100/50" },
      { href: "/member/average-score", icon: Target, label: "Average Score", color: "text-amber-600", bg: "bg-amber-100/50" },
      { href: "/member/hall-of-fame", icon: Award, label: "Hall of Fame", color: "text-yellow-600", bg: "bg-yellow-100/50" },
    ]
  },
  {
    title: "Permainan & Undian",
    items: [
      { href: "/member/undi-lane", icon: Dices, label: "Lane Draw", color: "text-purple-600", bg: "bg-purple-100/50" },
      { href: "/member/undi-trio", icon: Shuffle, label: "Undi Trio", color: "text-fuchsia-600", bg: "bg-fuchsia-100/50" },
      { href: "/member/lane", icon: MapPin, label: "Lane", color: "text-rose-600", bg: "bg-rose-100/50" },
      { href: "/member/mini-blok", icon: Gamepad2, label: "Mini Blok", color: "text-indigo-600", bg: "bg-indigo-100/50" },
      { href: "/member/training", icon: TrendingUp, label: "Training", color: "text-teal-600", bg: "bg-teal-100/50" },
    ]
  },
  {
    title: "Komuniti & Bantuan",
    items: [
      { href: "/member/gallery", icon: Image, label: "Gallery", color: "text-pink-600", bg: "bg-pink-100/50" },
      { href: "/member/feedback", icon: MessageSquare, label: "Feedback", color: "text-slate-600", bg: "bg-slate-100/50" },
    ]
  }
];

function isRouteActive(pathname: string, href: string) {
  return pathname === href;
}

const triggerHaptic = () => {
  if (typeof window !== "undefined" && navigator.vibrate) {
    // Getaran ringan 30ms untuk rasa tactile
    navigator.vibrate(30);
  }
};

export function MobileNav() {
  const router = useRouter();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const activeSecondaryItem = useMemo(
    () => menuGroups.flatMap(g => g.items).find((item) => isRouteActive(router.pathname, item.href)) ?? null,
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
                    onClick={triggerHaptic}
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
                    onClick={triggerHaptic}
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
                  className="flex max-h-[85vh] flex-col rounded-t-[32px] border-x border-t border-slate-200/80 bg-slate-50/95 px-0 pb-6 pt-4 backdrop-blur-xl"
                >
                  <SheetHeader className="shrink-0 px-5 pb-2 text-left">
                    <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200" />
                    <SheetTitle className="text-xl font-bold tracking-tight text-slate-900">
                      Menu Pilihan
                    </SheetTitle>
                  </SheetHeader>

                  <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
                    <div className="flex flex-col gap-6">
                      {menuGroups.map((group) => (
                        <div key={group.title}>
                          <h4 className="mb-2 px-3 text-[12px] font-semibold uppercase tracking-wider text-slate-500">
                            {group.title}
                          </h4>
                          <div className="flex flex-col overflow-hidden rounded-[24px] border border-slate-200/60 bg-white shadow-sm ring-1 ring-black/5">
                            {group.items.map((item, idx) => {
                              const Icon = item.icon;
                              const isActive = isRouteActive(router.pathname, item.href);

                              return (
                                <SheetClose asChild key={item.href}>
                                  <Link
                                    href={item.href}
                                    onClick={triggerHaptic}
                                    className={[
                                      "group/menu flex items-center gap-4 px-4 py-3.5 transition-colors active:bg-slate-50",
                                      isActive ? "bg-sky-50/30" : "bg-white hover:bg-slate-50/50",
                                      idx !== group.items.length - 1 ? "border-b border-slate-100/80" : ""
                                    ].join(" ")}
                                  >
                                    <div
                                      className={[
                                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-active/menu:scale-95",
                                        isActive ? "bg-sky-500 text-white shadow-md shadow-sky-500/20" : `${item.bg} ${item.color}`,
                                      ].join(" ")}
                                    >
                                      <Icon className="h-5 w-5" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <p className={[
                                        "truncate text-[15px] font-medium transition-colors",
                                        isActive ? "text-sky-700 font-semibold" : "text-slate-700 group-hover/menu:text-slate-900"
                                      ].join(" ")}
                                      >
                                        {item.label}
                                      </p>
                                    </div>

                                    {isActive ? (
                                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100">
                                        <div className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                                      </div>
                                    ) : (
                                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition-transform group-hover/menu:translate-x-0.5" />
                                    )}
                                  </Link>
                                </SheetClose>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {activeSecondaryItem && (
                      <div className="mt-6 rounded-2xl bg-sky-50/80 px-4 py-3.5 text-center text-sm text-sky-800 shadow-sm ring-1 ring-sky-200/50">
                        Anda sedang berada di <span className="font-semibold">{activeSecondaryItem.label}</span>
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