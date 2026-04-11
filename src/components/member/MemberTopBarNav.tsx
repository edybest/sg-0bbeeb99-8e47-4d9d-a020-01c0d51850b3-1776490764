import Link from "next/link";
import { useState, useEffect } from "react";
import { Bell, LogOut, User, Users, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { NotificationInbox } from "@/components/notifications/NotificationInbox";
import { notificationService } from "@/services/notificationService";
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
    <div className="flex items-center gap-4">
      {/* Couple */}
      <Link href="/member/couple">
        <Button variant="ghost" size="icon">
          <Heart className="h-5 w-5" />
        </Button>
      </Link>

      {/* Chat */}
      <Link href="/member/chat">
        <Button variant="ghost" size="icon">
          <Users className="h-5 w-5" />
        </Button>
      </Link>

      {/* Notifications */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="end">
          <NotificationInbox />
        </PopoverContent>
      </Popover>

      {/* Profile */}
      <Link href="/member/profile">
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </Link>

      {/* Logout */}
      <Button variant="ghost" size="icon" onClick={handleSignOut}>
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
  );
}