import Link from "next/link";
import { useRouter } from "next/router";
import { Bell, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { NotificationInbox } from "@/components/notifications/NotificationInbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function MemberTopBarNav() {
  const { member, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const displayName = member?.full_name || member?.username || "Member";
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-rose-200/50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md shadow-soft">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto max-w-7xl">
        <div className="flex items-center gap-4">
          <Link href="/member" className="flex items-center gap-3 group">
   
            <span className="font-serif font-bold text-xl sm:inline-block bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent tracking-tight">
              AMBC Club
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-full h-10 w-10 transition-colors"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-gray-950" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="w-[400px] max-w-[calc(100vw-2rem)] border-rose-100 shadow-large mt-2" 
              align="end"
            >
              <NotificationInbox />
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full ml-1 sm:ml-2 ring-2 ring-rose-200 hover:ring-rose-300 transition-all p-0 overflow-hidden">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member?.avatar_url || ""} alt={displayName} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600 font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 border-rose-100 shadow-large mt-2" align="end" forceMount>
              <DropdownMenuLabel className="font-normal p-3">
                <div className="flex flex-col space-y-1.5">
                  <p className="text-sm font-semibold leading-none text-foreground">{displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {member?.email || "AMBC Member"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-rose-100" />
              <DropdownMenuItem asChild className="p-2">
                <Link href="/member/profile" className="flex items-center cursor-pointer text-foreground hover:text-rose-600 focus:text-rose-600 focus:bg-rose-50 rounded-lg transition-colors">
                  <User className="mr-3 h-4 w-4" />
                  <span className="font-medium">My Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="p-2 text-rose-600 focus:text-rose-700 focus:bg-rose-50 rounded-lg cursor-pointer transition-colors">
                <LogOut className="mr-3 h-4 w-4" />
                <span className="font-medium">Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}