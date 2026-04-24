import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { notificationService } from "@/services/notificationService";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ServiceWorkerPushMessage = {
  type?: string;
};

export function NotificationBell() {
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousCountRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedAtRef = useRef(0);
  const animationTimeoutRef = useRef<number | null>(null);

  const playNotificationSound = useCallback(async () => {
    const audio = audioRef.current;
    const now = Date.now();

    if (!audio || now - lastPlayedAtRef.current < 1500) {
      return;
    }

    lastPlayedAtRef.current = now;

    try {
      audio.currentTime = 0;
      await audio.play();
    } catch (error) {
      console.warn("Notification sound playback was blocked:", error);
    }
  }, []);

  const triggerNotificationFeedback = useCallback(
    (newNotifications: number) => {
      setIsAnimating(true);
      void playNotificationSound();

      toast({
        title: `🔔 ${newNotifications} Notification Baru`,
        description: "Klik bell icon untuk lihat",
        duration: 4000,
      });

      if (animationTimeoutRef.current) {
        window.clearTimeout(animationTimeoutRef.current);
      }

      animationTimeoutRef.current = window.setTimeout(() => {
        setIsAnimating(false);
      }, 1000);
    },
    [playNotificationSound, toast]
  );

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      const previousCount = previousCountRef.current;

      if (previousCount !== null && count > previousCount) {
        triggerNotificationFeedback(count - previousCount);
      }

      previousCountRef.current = count;
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to load unread count:", error);
    }
  }, [triggerNotificationFeedback]);

  useEffect(() => {
    const audio = new Audio("/win.mp3");
    audio.preload = "auto";
    audio.volume = 0.9;
    audioRef.current = audio;

    const primeAudio = () => {
      const currentAudio = audioRef.current;

      if (!currentAudio) {
        return;
      }

      currentAudio.muted = true;
      void currentAudio.play().then(() => {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio.muted = false;
      }).catch(() => {
        currentAudio.currentTime = 0;
        currentAudio.muted = false;
      });
    };

    window.addEventListener("pointerdown", primeAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", primeAudio);

      if (animationTimeoutRef.current) {
        window.clearTimeout(animationTimeoutRef.current);
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    void loadUnreadCount();

    const interval = window.setInterval(() => {
      void loadUnreadCount();
    }, 30000);

    const handleUpdate = () => {
      void loadUnreadCount();
    };

    const handleServiceWorkerMessage = (event: MessageEvent<ServiceWorkerPushMessage>) => {
      if (event.data?.type === "push-received") {
        void loadUnreadCount();
      }
    };

    window.addEventListener("notifications-updated", handleUpdate);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    }

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("notifications-updated", handleUpdate);

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
      }
    };
  }, [loadUnreadCount]);

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