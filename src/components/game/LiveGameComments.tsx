import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Ban, Trash2, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { gameCommentService, BOWLING_EMOJIS, type GameCommentWithMember } from "@/services/gameCommentService";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LiveGameCommentsProps {
  gameId: string;
  gameName: string;
}

export function LiveGameComments({ gameId, gameName }: LiveGameCommentsProps) {
  const { member, isAdmin } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<GameCommentWithMember[]>([]);
  const [showComments, setShowComments] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [memberToBan, setMemberToBan] = useState<{ id: string; name: string } | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize Web Audio API for pop sound
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Play pop sound effect
  const playPopSound = () => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  };

  // Load initial comments
  useEffect(() => {
    loadComments();
  }, [gameId]);

  // Subscribe to real-time updates (AUTO WITHOUT REFRESH)
  useEffect(() => {
    const unsubscribe = gameCommentService.subscribeToGameComments(gameId, (newComment) => {
      setComments((prev) => {
        // Avoid duplicates
        if (prev.some(c => c.id === newComment.id)) return prev;
        
        // Play sound for new comments
        playPopSound();
        
        // Add new comment to top, keep only last 20
        return [newComment, ...prev].slice(0, 20);
      });
    });

    return unsubscribe;
  }, [gameId]);

  const loadComments = async () => {
    try {
      const data = await gameCommentService.getGameComments(gameId);
      setComments(data.slice(0, 20)); // Show latest 20
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const handlePostComment = async () => {
    if (!member) {
      toast({
        title: "Login Required",
        description: "Please login to post comments",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim() && !selectedEmoji) {
      toast({
        title: "Empty Comment",
        description: "Please enter a comment or select an emoji",
        variant: "destructive",
      });
      return;
    }

    setIsPosting(true);
    try {
      await gameCommentService.postComment(gameId, member.id, {
        text: newComment.trim() || undefined,
        emoji: selectedEmoji || undefined,
        isAnimated: selectedEmoji ? BOWLING_EMOJIS[selectedEmoji as keyof typeof BOWLING_EMOJIS]?.animated : false,
      });

      setNewComment("");
      setSelectedEmoji(null);
      
      toast({
        title: "Comment Posted!",
        description: "Your comment is now live",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to post comment",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete || !member) return;

    try {
      await gameCommentService.deleteComment(commentToDelete, member.id);
      setComments((prev) => prev.filter((c) => c.id !== commentToDelete));
      
      toast({
        title: "Comment Deleted",
        description: "The comment has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment",
        variant: "destructive",
      });
    } finally {
      setCommentToDelete(null);
    }
  };

  const handleBanUser = async () => {
    if (!memberToBan || !member) return;

    try {
      await gameCommentService.banUser(memberToBan.id, member.id, {
        gameId: gameId,
        reason: "Banned from posting comments",
      });
      
      // Remove all comments from this user
      setComments((prev) => prev.filter((c) => c.member_id !== memberToBan.id));
      
      toast({
        title: "User Banned",
        description: `${memberToBan.name} has been banned from posting comments on this game`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to ban user",
        variant: "destructive",
      });
    } finally {
      setMemberToBan(null);
    }
  };

  return (
    <>
      {/* Floating Comments Display - TikTok Style with SLOW animation */}
      {showComments && (
        <div className="fixed left-0 right-0 bottom-40 pointer-events-none z-[9999] px-4">
          <div className="max-w-screen-xl mx-auto flex flex-col items-end">
            <div className="space-y-2 flex flex-col items-end">
              {comments.slice(0, 5).map((comment, index) => (
                <div
                  key={comment.id}
                  className="animate-slide-up-slow opacity-0 pointer-events-auto"
                  style={{
                    animationDelay: `${index * 200}ms`,
                    animationFillMode: "forwards",
                  }}
                >
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-black/80 to-black/70 backdrop-blur-md text-white px-4 py-2.5 rounded-full shadow-2xl border border-white/10 max-w-[85%] md:max-w-md">
                    <span className="font-bold text-sm bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
                      {comment.member?.username || "Unknown"}:
                    </span>
                    {comment.emoji_code && (
                      <span
                        className={`text-2xl ${comment.is_animated ? "animate-bounce" : ""}`}
                      >
                        {comment.emoji_code}
                      </span>
                    )}
                    {comment.comment_text && (
                      <span className="text-sm font-medium">{comment.comment_text}</span>
                    )}
                    {isAdmin && (
                      <div className="flex gap-1 ml-2 border-l border-white/20 pl-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          onClick={() => setCommentToDelete(comment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-orange-400 hover:text-orange-300 hover:bg-orange-500/20"
                          onClick={() =>
                            setMemberToBan({
                              id: comment.member_id,
                              name: comment.member?.username || "User",
                            })
                          }
                        >
                          <Ban className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Comment Controls - Adjusted higher to bottom-24 to avoid mobile bottom nav */}
      <div className="fixed bottom-24 right-4 z-[9999] flex gap-2">
        <Button
          size="sm"
          variant={showComments ? "default" : "outline"}
          onClick={() => setShowComments(!showComments)}
          className="shadow-2xl h-12 w-12 rounded-full p-0 bg-gradient-to-br from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 border-2 border-white/20"
        >
          {showComments ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button 
              size="sm" 
              className="shadow-2xl h-12 px-4 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-2 border-white/20"
            >
              <Send className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Comment</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
            <SheetHeader>
              <SheetTitle className="text-lg">💬 Live Comments - {gameName}</SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              {/* Emoji Picker - Display ICONS only */}
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(BOWLING_EMOJIS).map(([key, emoji]) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={selectedEmoji === key ? "default" : "outline"}
                    onClick={() => setSelectedEmoji(selectedEmoji === key ? null : key)}
                    className={`text-2xl h-14 ${emoji.animated ? "hover:animate-bounce" : ""} ${
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

              {/* Recent Comments Preview */}
              <div className="max-h-[35vh] overflow-y-auto space-y-2 border-t pt-4">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Recent Comments:</p>
                {comments.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br from-muted/30 to-muted/50 hover:from-muted/50 hover:to-muted/70 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-sky-600 truncate">
                          {comment.member?.username}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {comment.emoji_code && (
                            <span className="text-xl">{comment.emoji_code}</span>
                          )}
                          {comment.comment_text && (
                            <span className="text-sm">{comment.comment_text}</span>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => setCommentToDelete(comment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-orange-500 hover:bg-orange-500/10"
                            onClick={() =>
                              setMemberToBan({
                                id: comment.member_id,
                                name: comment.member?.username || "User",
                              })
                            }
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <style jsx global>{`
        @keyframes slideUpSlow {
          0% {
            transform: translateY(120px);
            opacity: 0;
          }
          15% {
            opacity: 0.5;
          }
          25% {
            opacity: 1;
          }
          85% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(-20px);
            opacity: 0;
          }
        }

        .animate-slide-up-slow {
          animation: slideUpSlow 6s ease-in-out forwards;
        }

        /* Hide scrollbar but keep functionality */
        .overflow-y-auto {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .overflow-y-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}