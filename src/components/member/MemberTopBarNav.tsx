import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Bell, LogOut, User, Users, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { NotificationInbox } from "@/components/notifications/NotificationInbox";
import { notificationService } from "@/services/notificationService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NavigationMenuLink } from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export function MemberTopBarNav() {
  const { logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  async function loadUnreadCount() {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to load unread count:", error);
    }
  }

  useEffect(() => {
    void loadUnreadCount();

    // Listen for notification updates
    function handleNotificationUpdate() {
      void loadUnreadCount();
    }

    window.addEventListener("notifications-updated", handleNotificationUpdate);
    return () => window.removeEventListener("notifications-updated", handleNotificationUpdate);
  }, []);

  async function handleSignOut() {
    await logout();
    window.location.href = "/login";
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {/* Couple Section */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/member/couple">
              <Button 
                variant="ghost" 
                size="icon"
                className="relative hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
              >
                <Heart className="h-5 w-5" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Couple Management</p>
          </TooltipContent>
        </Tooltip>

        {/* Chat Section */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/member/chat">
              <Button 
                variant="ghost" 
                size="icon"
                className="relative hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
              >
                <Users className="h-5 w-5" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Chat Rooms</p>
          </TooltipContent>
        </Tooltip>

        {/* Notification Bell with Badge */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow-lg ring-2 ring-background animate-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Notifications'}</p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent className="w-96" align="end">
            <NotificationInbox />
          </PopoverContent>
        </Popover>

        {/* Profile Section */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/member/profile">
              <Button 
                variant="ghost" 
                size="icon"
                className="relative hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
              >
                <User className="h-5 w-5" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>My Profile</p>
          </TooltipContent>
        </Tooltip>

        {/* Logout Section */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleSignOut}
              className="relative hover:bg-destructive/10 hover:text-destructive transition-all duration-200 hover:scale-110"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Sign Out</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}