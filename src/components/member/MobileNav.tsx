import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Trophy, Target, Award, BarChart3, User, Home, Shuffle, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { navLayoutService } from "@/services/navLayoutService";

const navItems = [
  { key: "dashboard", href: "/member", label: "Dashboard", icon: Home },
  { key: "blok", href: "/member/blok", label: "Blok", icon: Trophy },
  { key: "fivefive", href: "/member/five-five", label: "FiveFive", icon: Target },
  { key: "training", href: "/member/training", label: "Training", icon: Target },
  { key: "gallery", href: "/member/gallery", label: "Gallery", icon: Trophy },
  { key: "undi_lane", href: "/member/undi-lane", label: "Undi Lane", icon: Shuffle },
  { key: "hall_of_fame", href: "/member/hall-of-fame", label: "Hall of Fame", icon: Award },
  { key: "average_score", href: "/member/average-score", label: "Average Score", icon: BarChart3 },
  { key: "feedback", href: "/member/feedback", label: "Feedback", icon: MessageSquare },
  { key: "profile", href: "/member/profile", label: "Profile", icon: User },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [orderedItems, setOrderedItems] = useState(navItems);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const layout = await navLayoutService.getLayout("member_menu");
      setOrderedItems(navLayoutService.applyOrder(navItems, layout?.order ?? null));
    })();
  }, []);

  const isActive = (href: string) => {
    if (href === "/member") {
      return router.pathname === href;
    }
    return router.pathname.startsWith(href);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[350px]">
        <SheetHeader>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SheetTitle className="text-red-600">AMBC CLUB</SheetTitle>
          </motion.div>
        </SheetHeader>
        <nav className="mt-6 flex flex-col space-y-2">
          <AnimatePresence>
            {orderedItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ 
                    duration: 0.3,
                    delay: index * 0.05,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      active
                        ? "bg-red-600 text-white shadow-md"
                        : "text-gray-700 hover:bg-gray-100 hover:text-red-600 hover:translate-x-1"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </nav>
      </SheetContent>
    </Sheet>
  );
}