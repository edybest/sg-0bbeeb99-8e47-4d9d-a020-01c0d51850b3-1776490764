import Link from "next/link";
import { useRouter } from "next/router";
import { Home, Trophy, Target, Award, MapPin, Dices, Gamepad2, TrendingUp, Image, MessageSquare, User, Star, Shuffle, MessageCircle, Heart } from "lucide-react";

const menuItems = [
  { href: "/member", icon: Home, label: "Home" },
  { href: "/member/blok", icon: Trophy, label: "Blok" },
  { href: "/member/couple", icon: Heart, label: "Couple" },
  { href: "/member/five-five", icon: Star, label: "5+5" },
  { href: "/member/hall-of-fame", icon: Award, label: "Hall of Fame" },
  { href: "/member/average-score", icon: Target, label: "Average" },
  { href: "/member/undi-lane", icon: Dices, label: "Lane Draw" },
  { href: "/member/lane", icon: MapPin, label: "Lane" },
  { href: "/member/mini-blok", icon: Gamepad2, label: "Mini" },
  { href: "/member/chat", icon: MessageCircle, label: "Chat" },
  { href: "/member/training", icon: TrendingUp, label: "Train" },
  { href: "/member/gallery", icon: Image, label: "Gallery" },
  { href: "/member/feedback", icon: MessageSquare, label: "Feedback" },
  { href: "/member/profile", icon: User, label: "Profile" },
];

export function MobileNav() {
  const router = useRouter();

  return (
    <>
      {/* Bottom Navigation - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-sky-100 shadow-2xl shadow-sky-200/50 sm:hidden">
        {/* Scrollable Menu Container */}
        <div className="overflow-x-auto overflow-y-hidden scrollbar-hide">
          <div className="flex items-center min-w-max px-2 py-2">
            {menuItems.map((item) => {
              const isActive = router.pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex flex-col items-center justify-center
                    min-w-[72px] px-3 py-2 rounded-xl
                    transition-all duration-300 ease-in-out
                    ${
                      isActive
                        ? "bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-lg shadow-blue-500/50 scale-105"
                        : "text-gray-600 hover:bg-sky-50 hover:text-sky-600 active:scale-95"
                    }
                  `}
                >
                  <Icon
                    className={`w-5 h-5 mb-1 transition-transform ${
                      isActive ? "animate-bounce" : ""
                    }`}
                  />
                  <span className="text-[10px] font-medium text-center leading-tight whitespace-nowrap">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Spacer for bottom nav */}
      <div className="h-[72px] sm:hidden" />

      {/* Hide scrollbar globally for mobile nav */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}