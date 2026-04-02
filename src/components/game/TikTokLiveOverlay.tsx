import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, Eye, EyeOff, Users, Clock } from "lucide-react";
import { gameCommentService } from "@/services/gameCommentService";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CommentDebugPanel } from "./CommentDebugPanel";

interface Comment {
  id: string;
  member_id: string;
  username: string;
  text?: string;
  emoji?: string;
  created_at: string;
}

interface ScrollingComment {
  id: string;
  username: string;
  text: string;
  emoji?: string;
  timestamp: string;
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
  const [scrollingComments, setScrollingComments] = useState<ScrollingComment[]>([]);
  const [recentComments, setRecentComments] = useState<ScrollingComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const presenceIntervalRef = useRef<NodeJS.Timeout>();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Baru sahaja";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}j`;
    return date.toLocaleDateString("ms-MY", { day: "numeric", month: "short" });
  };

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

    updatePresence();
    presenceIntervalRef.current = setInterval(updatePresence, 30000);

    return () => {
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
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
        .gte("last_seen", new Date(Date.now() - 120000).toISOString());

      setViewerCount(count || 0);
    };

    fetchViewerCount();

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

  // Load existing comments on mount
  useEffect(() => {
    const loadExistingComments = async () => {
      try {
        const comments = await gameCommentService.getGameComments(gameId);
        
        const formattedComments = comments.map((comment: any) => ({
          id: comment.id,
          username: comment.member?.username || "Anonymous",
          text: comment.comment_text || comment.text || "",
          emoji: comment.emoji_code || comment.emoji,
          timestamp: comment.created_at,
        })).filter((c: ScrollingComment) => c.text || c.emoji);

        setScrollingComments(formattedComments);
        setRecentComments(formattedComments.slice(-20)); // Keep last 20 for history
      } catch (error) {
        console.error("Error loading existing comments:", error);
      }
    };

    loadExistingComments();
  }, [gameId]);

  // Subscribe to real-time comments
  useEffect(() => {
    const unsubscribe = gameCommentService.subscribeToGameComments(
      gameId,
      (comment: any) => {
        const emojiCode = comment.emoji_code || comment.emoji;
        const commentText = comment.comment_text || comment.text;
        const username = comment.member?.username || comment.username || "Anonymous";

        if (commentText || emojiCode) {
          const newScrollComment: ScrollingComment = {
            id: comment.id,
            username: username,
            text: commentText || "",
            emoji: emojiCode,
            timestamp: comment.created_at || new Date().toISOString(),
          };

          setScrollingComments((prev) => [...prev, newScrollComment]);
          setRecentComments((prev) => [...prev.slice(-19), newScrollComment]); // Keep last 20
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [gameId]);

  // Auto-scroll animation (continuous loop)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || scrollingComments.length === 0) return;

    let animationId: number;
    let scrollPosition = 0;
    const scrollSpeed = 0.5; // pixels per frame (slow scrolling)

    const animate = () => {
      scrollPosition += scrollSpeed;
      
      // Get total height of all comments
      const totalHeight = container.scrollHeight;
      const visibleHeight = container.clientHeight;

      // Reset to bottom when scrolled past all comments
      if (scrollPosition >= totalHeight) {
        scrollPosition = 0;
      }

      container.scrollTop = scrollPosition;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [scrollingComments]);

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
      {/* Debug Panel - Mobile Friendly */}
      <CommentDebugPanel />

      {/* Viewer Count Badge - Top Left */}
      <div className="fixed top-4 left-4 z-[9998] bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300 animate-pulse-soft">
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

      {/* Auto-Scrolling Comments - Bottom Left */}
      <div 
        ref={scrollContainerRef}
        className="fixed left-4 bottom-24 w-80 h-[50vh] z-[9997] overflow-hidden pointer-events-none"
      >
        <div className="space-y-2">
          {/* Duplicate comments for infinite loop effect */}
          {[...scrollingComments, ...scrollingComments].map((comment, index) => (
            <div
              key={`${comment.id}-${index}`}
              className="bg-black/60 backdrop-blur-md text-white px-3 py-2 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <div className="flex items-start gap-2">
                {comment.emoji && (
                  <span className="text-2xl flex-shrink-0">
                    {BOWLING_EMOJIS[comment.emoji as keyof typeof BOWLING_EMOJIS]?.code || comment.emoji}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-blue-300 mb-0.5">
                    {comment.username}
                  </div>
                  {comment.text && (
                    <div className="text-sm break-words">{comment.text}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input Button - Bottom Right (Floating) */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-6 right-6 z-[9998] rounded-full w-14 h-14 shadow-2xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 animate-glow transition-all duration-300 hover:scale-110"
          >
            <MessageCircle className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[75vh] z-[9999] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-center">Komen Live - {gameName}</SheetTitle>
          </SheetHeader>

          {/* Recent Comments History */}
          {recentComments.length > 0 && (
            <div className="mt-4 mb-6">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-3">
                <Clock className="w-4 h-4" />
                <span>Komen Terkini</span>
              </div>
              <div className="max-h-[30vh] overflow-y-auto space-y-2 bg-gray-50 rounded-lg p-3">
                {recentComments.slice().reverse().map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-white rounded-lg p-3 shadow-sm border border-gray-100"
                  >
                    <div className="flex items-start gap-2">
                      {comment.emoji && (
                        <span className="text-xl flex-shrink-0">
                          {BOWLING_EMOJIS[comment.emoji as keyof typeof BOWLING_EMOJIS]?.code || comment.emoji}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-blue-600">
                            {comment.username}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatTime(comment.timestamp)}
                          </span>
                        </div>
                        {comment.text && (
                          <div className="text-sm text-gray-700 break-words">
                            {comment.text}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(147, 51, 234, 0.5);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }

        .animate-pulse-soft {
          animation: pulse 2s ease-in-out infinite;
        }

        /* Smooth scrolling container */
        .fixed.overflow-hidden::-webkit-scrollbar {
          display: none;
        }

        .fixed.overflow-hidden {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}