import Link from "next/link";
import { useRouter } from "next/router";
import { Home, Trophy, Target, Star, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const mainNavItems = [
  { href: "/member", icon: Home, label: "Home" },
  { href: "/member/training", icon: Target, label: "Train" },
  { href: "/member/blok", icon: Trophy, label: "Games" },
  { href: "/member/five-five", icon: Star, label: "5+5" },
];

const sideNavItems = [
  { href: "/member/undi-lane", label: "Lane Draw" },
  { href: "/member/hall-of-fame", label: "Hall of Fame" },
  { href: "/member/average-score", label: "Average" },
  { href: "/member/mini-blok", label: "Mini Blok" },
  { href: "/member/gallery", label: "Gallery" },
  { href: "/member/feedback", label: "Feedback" },
];

export function MobileNav() {
  const router = useRouter();

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 flex h-[72px] items-center justify-around bg-white/95 dark:bg-gray-950/95 backdrop-blur-lg border-t border-rose-200/50 pb-safe sm:hidden px-2 shadow-[0_-4px_24px_-8px_rgba(340,82%,65%,0.15)]">
        {mainNavItems.map((item) => {
          const isActive = router.pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-[72px] h-full space-y-1.5 relative transition-all duration-300",
                isActive ? "text-rose-600" : "text-muted-foreground hover:text-rose-500"
              )}
            >
              {isActive && (
                <span className="absolute top-0 w-10 h-1 bg-gradient-to-r from-rose-400 to-pink-500 rounded-b-full shadow-[0_2px_8px_rgba(340,82%,65%,0.5)]" />
              )}
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-300",
                isActive && "bg-rose-50 scale-110"
              )}>
                <item.icon className={cn("h-5 w-5", isActive && "animate-bounce")} />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-all duration-300",
                isActive && "font-semibold tracking-wide"
              )}>{item.label}</span>
            </Link>
          );
        })}

        <Sheet>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center w-[72px] h-full space-y-1.5 text-muted-foreground hover:text-rose-600 transition-all duration-300">
              <div className="p-1.5 rounded-xl hover:bg-rose-50 transition-colors">
                <Menu className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] sm:w-[340px] border-l-rose-200 border-0 border-l-2 p-0">
            <div className="h-full bg-gradient-to-b from-white to-pink-50/30 dark:from-gray-950 dark:to-pink-950/10 flex flex-col p-6">
              <SheetHeader className="text-left mb-8">
                <SheetTitle className="font-serif text-2xl bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">🎳</span>
                  More Features
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col space-y-2.5 overflow-y-auto pb-8 scrollbar-hide">
                {sideNavItems.map((item) => {
                  const isActive = router.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-between group",
                        isActive
                          ? "bg-gradient-to-r from-rose-50 to-transparent text-rose-600 border-l-4 border-rose-500 shadow-sm"
                          : "text-muted-foreground hover:bg-rose-50 hover:text-foreground hover:pl-6 border-l-4 border-transparent"
                      )}
                    >
                      {item.label}
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-600 text-xs">→</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      {/* Spacer for bottom nav */}
      <div className="h-[72px] sm:hidden" />
    </>
  );
}