import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Trophy, Target, Award, BarChart3, User, Home } from "lucide-react";

const navItems = [
  { href: "/member", label: "Dashboard", icon: Home },
  { href: "/member/blok", label: "Blok", icon: Trophy },
  { href: "/member/five-five", label: "FiveFive", icon: Target },
  { href: "/member/hall-of-fame", label: "Hall of Fame", icon: Award },
  { href: "/member/average-score", label: "Average Score", icon: BarChart3 },
  { href: "/member/profile", label: "Profile", icon: User },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

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
          <SheetTitle className="text-red-600">AMBC CLUB</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-red-600 text-white"
                    : "text-gray-700 hover:bg-gray-100 hover:text-red-600"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}