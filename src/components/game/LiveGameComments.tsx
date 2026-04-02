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
  const commentsContainerRef = useRef<HTMLDivElement>(null);

  // Load initial comments
  useEffect(() => {
    loadComments();
  }, [gameId]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = gameCommentService.subscribeToGameComments(gameId, (newComment) => {
      setComments((prev) => [newComment, ...prev].slice(0, 50));
      
      // Auto-scroll animation
      if (showComments && commentsContainerRef.current) {
        const container = commentsContainerRef.current;
        container.scrollTop = container.scrollHeight;
      }
    });

    return unsubscribe;
  }, [gameId, showComments]);

  const loadComments = async () => {
    try {
      const data = await gameCommentService.getGameComments(gameId);
      setComments(data.reverse()); // Reverse to show oldest first (bottom to top)
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
      {/* Floating Comments Display */}
      {showComments && (
        <div className="fixed bottom-20 left-0 right-0 pointer-events-none z-40">
          <div
            ref={commentsContainerRef}
            className="max-h-[50vh] overflow-y-auto px-4 space-y-2 scrollbar-hide"
          >
            {comments.slice(-10).map((comment) => (
              <div
                key={comment.id}
                className="animate-slide-up-fade pointer-events-auto"
                style={{
                  animation: "slideUpFade 8s ease-out forwards",
                }}
              >
                <div className="inline-flex items-center gap-2 bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-full shadow-lg max-w-[80%]">
                  <span className="font-semibold text-sm">
                    {comment.member?.username || "Unknown"}:
                  </span>
                  {comment.emoji_code && (
                    <span
                      className={`text-xl ${comment.is_animated ? "animate-bounce" : ""}`}
                    >
                      {comment.emoji_code}
                    </span>
                  )}
                  {comment.comment_text && (
                    <span className="text-sm">{comment.comment_text}</span>
                  )}
                  {isAdmin && (
                    <div className="flex gap-1 ml-2">
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
      )}

      {/* Comment Controls */}
      <div className="fixed bottom-4 right-4 z-50 flex gap-2">
        <Button
          size="sm"
          variant={showComments ? "default" : "outline"}
          onClick={() => setShowComments(!showComments)}
          className="shadow-lg"
        >
          {showComments ? <X className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button size="sm" className="shadow-lg">
              <Send className="h-4 w-4 mr-2" />
              Comment
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[60vh]">
            <SheetHeader>
              <SheetTitle>Live Comments - {gameName}</SheetTitle>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              {/* Emoji Picker */}
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(BOWLING_EMOJIS).map(([key, emoji]) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={selectedEmoji === key ? "default" : "outline"}
                    onClick={() => setSelectedEmoji(selectedEmoji === key ? null : key)}
                    className={`text-2xl h-12 ${emoji.animated ? "hover:animate-bounce" : ""}`}
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
                />
                <Button onClick={handlePostComment} disabled={isPosting}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Recent Comments Preview */}
              <div className="max-h-[30vh] overflow-y-auto space-y-2 border-t pt-2">
                <p className="text-sm text-muted-foreground font-semibold">Recent Comments:</p>
                {comments.slice(0, 20).map((comment) => (
                  <div
                    key={comment.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{comment.member?.username}</p>
                      <div className="flex items-center gap-2">
                        {comment.emoji_code && (
                          <span className="text-lg">{comment.emoji_code}</span>
                        )}
                        {comment.comment_text && (
                          <span className="text-sm">{comment.comment_text}</span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => setCommentToDelete(comment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-orange-500"
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
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!commentToDelete} onOpenChange={() => setCommentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The comment will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteComment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban User Dialog */}
      <AlertDialog open={!!memberToBan} onOpenChange={() => setMemberToBan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban User from Comments?</AlertDialogTitle>
            <AlertDialogDescription>
              This will prevent {memberToBan?.name} from posting comments on this game.
              All their existing comments will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBanUser} className="bg-orange-500 text-white hover:bg-orange-600">
              Ban User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style jsx global>{`
        @keyframes slideUpFade {
          0% {
            transform: translateY(100%);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-200%);
            opacity: 0;
          }
        }

        .animate-slide-up-fade {
          animation: slideUpFade 8s ease-out forwards;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}