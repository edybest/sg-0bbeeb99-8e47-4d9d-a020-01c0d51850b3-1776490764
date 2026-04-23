import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { notificationService } from "@/services/notificationService";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [previousCount, setPreviousCount] = useState(0);

  async function loadUnreadCount() {
    try {
      const count = await notificationService.getUnreadCount();
      
      if (count > previousCount && previousCount > 0) {
        setIsAnimating(true);
        const newNotifications = count - previousCount;
        toast({
          title: `🔔 ${newNotifications} Notification Baru`,
          description: "Klik bell icon untuk lihat",
          duration: 4000,
        });
        setTimeout(() => setIsAnimating(false), 1000);
      }
      
      setPreviousCount(count);
      setUnreadCount(count);
    } catch (e) {
      console.error("Failed to load unread count:", e);
    }
  }

  useEffect(() => {
    void loadUnreadCount();

    const interval = setInterval(() => {
      void loadUnreadCount();
    }, 30000);

    const handleUpdate = () => void loadUnreadCount();
    window.addEventListener("notifications-updated", handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications-updated", handleUpdate);
    };
  }, [previousCount]);

  return (
    <div className="relative inline-block">
      <Bell
        className={cn(
          "h-5 w-5 text-slate-700 transition-all duration-300",
          isAnimating && "animate-bounce text-sky-600",
          unreadCount > 0 && !isAnimating && "text-sky-600"
        )}
      />
      {unreadCount > 0 && (
        <span
          className={cn(
            "absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white transition-transform",
            isAnimating && "animate-pulse scale-110"
          )}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </div>
  );
}