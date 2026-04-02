import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, X, Eye, EyeOff, Users } from "lucide-react";
import { gameCommentService } from "@/services/gameCommentService";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Comment {
  id: string;
  member_id: string;
  username: string;
  text?: string;
  emoji?: string;
  created_at: string;
}

interface FloatingEmoji {
  id: string;
  emoji: string;
  left: number;
  isBurst?: boolean;
}

interface SlidingMessage {
  id: string;
  username: string;
  text: string;
  emoji?: string;
}

interface EmojiTracker {
  emoji: string;
  count: number;
  lastTime: number;
}

const BOWLING_EMOJIS = {
  strike: { code: "🎳", animated: true },
  spare: { code: "🎯", animated: false },
  fire: { code: "🔥", animated: true },
  trophy: { code: "🏆", animated: false },
  clap: { code: "👏", animated: true },
  heart: { code: "❤️", animated: false },
  star: { code: "⭐", animated: true },
  rocket: { code: "🚀", animated: false },
  party: { code: "🎉", animated: true },
  thumbsup: { code: "👍", animated: false },
};

const BURST_THRESHOLD = 3; // 3 same emojis within timeframe
const BURST_TIMEFRAME = 3000; // 3 seconds

export function TikTokLiveOverlay({ gameId, gameName }: { gameId: string; gameName: string }) {
  const { toast } = useToast();
  const { member: currentUser } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [slidingMessages, setSlidingMessages] = useState<SlidingMessage[]>([]);
  const [newComment, setNewComment] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const emojiTrackerRef = useRef<Map<string, EmojiTracker>>(new Map());
  const presenceIntervalRef = useRef<NodeJS.Timeout>();

  // Update viewer presence every 30 seconds
  useEffect(() => {
    if (!currentUser) return;

    const updatePresence = async () => {
      try {
        await supabase
          .from("game_viewers")
          .upsert({
            game_id: gameId,
            member_id: currentUser.id,
            last_seen: new Date().toISOString(),
          }, {
            onConflict: "game_id,member_id"
          });
      } catch (error) {
        console.error("Error updating presence:", error);
      }
    };

    // Initial presence
    updatePresence();

    // Update every 30 seconds
    presenceIntervalRef.current = setInterval(updatePresence, 30000);

    // Cleanup on unmount
    return () => {
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
      // Remove presence when leaving
      supabase
        .from("game_viewers")
        .delete()
        .eq("game_id", gameId)
        .eq("member_id", currentUser.id)
        .then();
    };
  }, [gameId, currentUser]);

  // Subscribe to viewer count changes
  useEffect(() => {
    const fetchViewerCount = async () => {
      const { count } = await supabase
        .from("game_viewers")
        .select("*", { count: "exact", head: true })
        .eq("game_id", gameId)
        .gte("last_seen", new Date(Date.now() - 120000).toISOString()); // Active in last 2 min

      setViewerCount(count || 0);
    };

    fetchViewerCount();

    // Subscribe to changes
    const channel = supabase
      .channel(`game_viewers:${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_viewers",
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          fetchViewerCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  // Subscribe to real-time comments
  useEffect(() => {
    const unsubscribe = gameCommentService.subscribeToGameComments(
      gameId,
      (comment: any) => {
        // Check for emoji burst
        if (comment.emoji) {
          const now = Date.now();
          const tracker = emojiTrackerRef.current.get(comment.emoji) || { emoji: comment.emoji, count: 0, lastTime: now };
          
          // Reset if too much time passed
          if (now - tracker.lastTime > BURST_TIMEFRAME) {
            tracker.count = 1;
          } else {
            tracker.count += 1;
          }
          
          tracker.lastTime = now;
          emojiTrackerRef.current.set(comment.emoji, tracker);

          const emojiData = BOWLING_EMOJIS[comment.emoji as keyof typeof BOWLING_EMOJIS];
          
          // Trigger burst if threshold reached
          if (tracker.count >= BURST_THRESHOLD) {
            addEmojiBurst(emojiData?.code || comment.emoji);
            // Reset counter after burst
            emojiTrackerRef.current.delete(comment.emoji);
          } else {
            addFloatingEmoji(emojiData?.code || comment.emoji);
          }
        }

        // Add sliding message
        if (comment.text) {
          const msgId = `msg-${Date.now()}-${Math.random()}`;
          setSlidingMessages((prev) => [
            ...prev,
            {
              id: msgId,
              username: comment.username || "Anonymous",
              text: comment.text,
              emoji: comment.emoji,
            },
          ]);

          // Remove after 5 seconds
          setTimeout(() => {
            setSlidingMessages((prev) => prev.filter((msg) => msg.id !== msgId));
          }, 5000);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [gameId]);

  const addFloatingEmoji = (emoji: string) => {
    const id = `emoji-${Date.now()}-${Math.random()}`;
    setFloatingEmojis((prev) => [
      ...prev,
      {
        id,
        emoji,
        left: Math.random() * 50,
        isBurst: false,
      },
    ]);

    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
    }, 3000);
  };

  const addEmojiBurst = (emoji: string) => {
    // Create multiple burst particles
    const burstCount = 8;
    for (let i = 0; i < burstCount; i++) {
      setTimeout(() => {
        const id = `burst-${Date.now()}-${Math.random()}-${i}`;
        setFloatingEmojis((prev) => [
          ...prev,
          {
            id,
            emoji,
            left: 15 + Math.random() * 40, // Spread wider
            isBurst: true,
          },
        ]);

        setTimeout(() => {
          setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
        }, 2500);
      }, i * 100); // Stagger the burst
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() && !selectedEmoji) {
      toast({
        title: "Tiada Komen",
        description: "Sila taip komen atau pilih emoji.",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: "Sila Log Masuk",
        description: "Anda perlu log masuk untuk komen.",
        variant: "destructive",
      });
      return;
    }

    setIsPosting(true);
    try {
      await gameCommentService.postComment(
        gameId, 
        currentUser.id, 
        {
          text: newComment.trim() || undefined,
          emoji: selectedEmoji || undefined,
        }
      );

      setNewComment("");
      setSelectedEmoji(null);

      toast({
        title: "Komen Dipos",
        description: "Komen anda telah berjaya dihantar!",
      });
    } catch (error: any) {
      console.error("Error posting comment:", error);
      toast({
        title: "Ralat",
        description: error.message || "Gagal menghantar komen.",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed top-4 right-4 z-[9998] flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setIsVisible(true)}
          className="shadow-lg"
        >
          <Eye className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Viewer Count Badge - Top Left */}
      <div className="fixed top-4 left-4 z-[9998] bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
        <Users className="w-4 h-4 text-green-400" />
        <span className="font-semibold text-sm">{viewerCount}</span>
        <span className="text-xs text-gray-300">menonton</span>
      </div>

      {/* Toggle Visibility Button - Top Right */}
      <div className="fixed top-4 right-4 z-[9998] flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setIsVisible(false)}
          className="shadow-lg"
        >
          <EyeOff className="w-4 h-4" />
        </Button>
      </div>

      {/* Floating Emojis - Left Side */}
      <div className="fixed left-4 bottom-24 w-20 h-[60vh] z-[9997] pointer-events-none">
        {floatingEmojis.map((emoji) => (
          <div
            key={emoji.id}
            className={`absolute bottom-0 ${emoji.isBurst ? "animate-burst" : "animate-float-up"}`}
            style={{
              left: `${emoji.left}px`,
              fontSize: emoji.isBurst ? "3rem" : "2rem",
              animationDelay: emoji.isBurst ? "0s" : undefined,
            }}
          >
            {emoji.emoji}
          </div>
        ))}
      </div>

      {/* Sliding Messages - Right Side */}
      <div className="fixed right-4 bottom-24 w-72 max-h-[50vh] z-[9997] pointer-events-none flex flex-col gap-2 items-end">
        {slidingMessages.map((msg) => (
          <div
            key={msg.id}
            className="bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg animate-slide-in-right max-w-full"
          >
            <div className="font-semibold text-xs text-blue-300 mb-1">
              {msg.emoji && (
                <span className="mr-1">{BOWLING_EMOJIS[msg.emoji as keyof typeof BOWLING_EMOJIS]?.code}</span>
              )}
              {msg.username}
            </div>
            <div className="text-sm break-words">{msg.text}</div>
          </div>
        ))}
      </div>

      {/* Input Button - Bottom Right (Floating) */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-6 right-6 z-[9998] rounded-full w-14 h-14 shadow-2xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            <MessageCircle className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[65vh] z-[9999]">
          <SheetHeader>
            <SheetTitle className="text-center">Komen Live - {gameName}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Emoji Picker */}
            <div>
              <label className="text-sm font-medium mb-2 block">Pilih Emoji</label>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(BOWLING_EMOJIS).map(([key, emoji]) => (
                  <Button
                    key={key}
                    size="lg"
                    variant={selectedEmoji === key ? "default" : "outline"}
                    onClick={() => setSelectedEmoji(selectedEmoji === key ? null : key)}
                    className={`text-2xl h-14 ${emoji.animated ? "hover:animate-bounce" : ""} ${
                      selectedEmoji === key ? "ring-2 ring-blue-500 ring-offset-2" : ""
                    }`}
                    title={key}
                  >
                    {emoji.code}
                  </Button>
                ))}
              </div>
            </div>

            {/* Text Input */}
            <div>
              <label className="text-sm font-medium mb-2 block">Mesej (Pilihan)</label>
              <Input
                placeholder="Taip komen anda..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handlePostComment();
                  }
                }}
                className="text-base"
              />
            </div>

            {/* Send Button */}
            <Button
              onClick={handlePostComment}
              disabled={isPosting || (!newComment.trim() && !selectedEmoji)}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 h-12 text-base font-semibold"
            >
              {isPosting ? (
                "Menghantar..."
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Hantar Komen
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Custom Animations */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(1) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: translateY(-30vh) scale(1.2) rotate(180deg);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-60vh) scale(0.8) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes burst {
          0% {
            transform: translateY(0) scale(0.5) rotate(0deg);
            opacity: 1;
          }
          30% {
            transform: translateY(-20vh) scale(2) rotate(90deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-50vh) scale(1.5) rotate(180deg);
            opacity: 0;
          }
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-float-up {
          animation: floatUp 3s ease-out forwards;
        }

        .animate-burst {
          animation: burst 2.5s ease-out forwards;
        }

        .animate-slide-in-right {
          animation: slideInRight 0.5s ease-out;
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}