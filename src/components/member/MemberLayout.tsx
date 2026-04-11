import { ReactNode } from "react";
import { MemberTopBarNav } from "./MemberTopBarNav";
import { MobileNav } from "./MobileNav";
import { ClubLogo } from "@/components/ClubLogo";
import Link from "next/link";

interface MemberLayoutProps {
  children: ReactNode;
}

export function MemberLayout({ children }: MemberLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Top Navigation Bar - Enhanced Design */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo Section */}
          <Link href="/member" className="flex items-center gap-3 transition-transform hover:scale-105">
            <ClubLogo className="h-10 w-10" />
            <div className="flex flex-col">
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                AMBC Club
              </span>
              <span className="text-xs text-muted-foreground">
                Member Portal
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex">
            <MemberTopBarNav />
          </div>

          {/* Mobile Navigation Toggle */}
          <div className="md:hidden">
            <MobileNav />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Optional Footer */}
      <footer className="mt-auto border-t bg-background/50 backdrop-blur">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} AMBC Club. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}