import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, LogOut, User, Users, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NotificationInbox } from "@/components/notifications/NotificationInbox";
import { useAuth } from "@/hooks/useAuth";
import { notificationService } from "@/services/notificationService";

export function MemberTopBarNav() {
  const { signOut } = useAuth();
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
    await signOut();
    window.location.href = "/login";
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/member/couple">
        <Button variant="ghost" size="icon">
          <Heart className="h-5 w-5" />
        </Button>
      </Link>

      <Link href="/member/chat">
        <Button variant="ghost" size="icon">
          <Users className="h-5 w-5" />
        </Button>
      </Link>

      {/* Notification Bell with Badge */}
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

      <Link href="/member/profile">
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </Link>

      <Button variant="ghost" size="icon" onClick={handleSignOut}>
        <LogOut className="h-5 w-5" />
      </Button>
    </div>
  );
}