import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, X, Eye, EyeOff } from "lucide-react";
import { gameCommentService } from "@/services/gameCommentService";
import { useAuth } from "@/hooks/useAuth";

interface Comment {
  id: string;
  member_id: string;
  comment_text: string | null;
  emoji: string | null;
  created_at: string;
  member?: {
    username: string;
  };
}

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

interface SlidingMessage {
  id: string;
  username: string;
  text: string;
  timestamp: number;
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

export function TikTokLiveOverlay({ gameId, gameName }: { gameId: string; gameName: string }) {
  const { toast } = useToast();
  const { member: currentUser } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [slidingMessages, setSlidingMessages] = useState<SlidingMessage[]>([]);
  const [newComment, setNewComment] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const emojiCounterRef = useRef(0);
  const messageCounterRef = useRef(0);

  // Subscribe to real-time comments
  useEffect(() => {
    const unsubscribe = gameCommentService.subscribeToGameComments(
      gameId,
      (comment: any) => {
        // Add emoji animation
        if (comment.emoji) {
          const emojiData = BOWLING_EMOJIS[comment.emoji as keyof typeof BOWLING_EMOJIS];
          if (emojiData) {
            addFloatingEmoji(emojiData.code);
          }
        }

        // Add sliding message
        if (comment.comment_text) {
          addSlidingMessage(
            comment.member?.username || "Member",
            comment.comment_text
          );
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [gameId]);

  const addFloatingEmoji = (emoji: string) => {
    const id = `emoji-${Date.now()}-${emojiCounterRef.current++}`;
    const x = Math.random() * 50; // Random position 0-50px from left
    
    setFloatingEmojis((prev) => [...prev, { id, emoji, x, y: 100 }]);

    // Remove after animation (3s)
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
    }, 3000);
  };

  const addSlidingMessage = (username: string, text: string) => {
    const id = `msg-${Date.now()}-${messageCounterRef.current++}`;
    const timestamp = Date.now();

    setSlidingMessages((prev) => [...prev, { id, username, text, timestamp }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setSlidingMessages((prev) => prev.filter((m) => m.id !== id));
    }, 5000);
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
          comment_text: newComment.trim() || undefined,
          emoji: selectedEmoji || undefined,
        }
      );

      setNewComment("");
      setSelectedEmoji(null);

      toast({
        title: "Komen Dihantar",
        description: "Komen anda telah dihantar.",
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

  return (
    <>
      {/* Toggle Button - Fixed top-right */}
      <Button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed top-20 right-4 z-[9998] rounded-full w-12 h-12 p-0 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg"
        title={isVisible ? "Hide Live Comments" : "Show Live Comments"}
      >
        {isVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </Button>

      {/* Floating Emojis - Left Side */}
      {isVisible && (
        <div className="fixed left-4 bottom-20 w-20 h-[60vh] pointer-events-none z-[9997]">
          {floatingEmojis.map((emoji) => (
            <div
              key={emoji.id}
              className="absolute text-4xl animate-float-up"
              style={{
                left: `${emoji.x}px`,
                bottom: "0px",
                animation: "floatUp 3s ease-out forwards",
              }}
            >
              {emoji.emoji}
            </div>
          ))}
        </div>
      )}

      {/* Sliding Messages - Right Side */}
      {isVisible && (
        <div className="fixed right-4 bottom-32 max-w-[280px] space-y-2 pointer-events-none z-[9997]">
          {slidingMessages.map((msg) => (
            <div
              key={msg.id}
              className="animate-slide-in-right bg-black/60 backdrop-blur-sm rounded-2xl px-4 py-2 text-white"
              style={{
                animation: "slideInRight 0.3s ease-out, fadeOut 0.5s ease-in 4.5s forwards",
              }}
            >
              <p className="text-xs font-semibold text-pink-400">{msg.username}</p>
              <p className="text-sm">{msg.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Input Sheet - Bottom */}
      <Sheet>
        <SheetTrigger asChild>
          <Button className="fixed bottom-20 right-4 z-[9998] rounded-full w-14 h-14 p-0 bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg">
            <MessageCircle className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[65vh] rounded-t-3xl z-[9999] bottom-20 md:bottom-0">
          <SheetHeader>
            <SheetTitle className="text-lg">💬 Live Comments - {gameName}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Emoji Picker */}
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(BOWLING_EMOJIS).map(([key, emoji]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={selectedEmoji === key ? "default" : "outline"}
                  onClick={() => setSelectedEmoji(selectedEmoji === key ? null : key)}
                  className={`text-2xl h-12 ${emoji.animated ? "hover:animate-bounce" : ""} ${
                    selectedEmoji === key ? "ring-2 ring-sky-500 ring-offset-2" : ""
                  }`}
                  title={key}
                >
                  {emoji.code}
                </Button>
              ))}
            </div>

            {/* Text Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Type your comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !isPosting) {
                    handlePostComment();
                  }
                }}
                maxLength={100}
                className="text-base h-12"
              />
              <Button
                onClick={handlePostComment}
                disabled={isPosting}
                className="h-12 w-12 p-0 bg-gradient-to-br from-green-500 to-emerald-600"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              💡 Pilih emoji atau taip mesej untuk hantar live comment
            </p>
          </div>
        </SheetContent>
      </Sheet>

      <style jsx>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-40vh) scale(1.2);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-60vh) scale(0.8);
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