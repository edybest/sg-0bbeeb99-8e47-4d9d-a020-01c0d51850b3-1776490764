import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Ban, Trash2, Send, Eye } from "lucide-react";
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
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface LiveGameCommentsProps {
  gameId: string;
  gameName: string;
}

export function LiveGameComments({ gameId, gameName }: LiveGameCommentsProps) {
  const { member } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<GameCommentWithMember[]>([]);
  const [showComments, setShowComments] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [memberToBan, setMemberToBan] = useState<{ id: string; name: string } | null>(null);
  const [emojiSearchQuery, setEmojiSearchQuery] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editEmoji, setEditEmoji] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Auth user:", user);
      
      if (user) {
        // Query members table to get member_id and is_admin
        const { data: memberData, error } = await supabase
          .from("members")
          .select("*, is_admin")
          .eq("user_id", user.id)
          .single();
        
        console.log("Fetched member data:", memberData, "Error:", error);
        
        if (memberData) {
          setCurrentUser(memberData);
          setCurrentMemberId(memberData.id);
          setIsAdmin(memberData.is_admin === true);
          
          console.log("State set - currentMemberId:", memberData.id, "isAdmin:", memberData.is_admin);
        } else {
          console.error("No member data found for user:", user.id);
        }
      } else {
        console.log("No authenticated user");
      }
    };
    fetchUser();
  }, []);

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
    if (!gameId) return;

    const loadComments = async () => {
      try {
        const data = await gameCommentService.getGameComments(gameId);
        setComments(data);
      } catch (error) {
        console.error("Error loading comments:", error);
      }
    };

    loadComments();

    // Set up real-time subscription for new comments
    const channel = supabase
      .channel(`game-comments-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_comments",
          filter: `game_id=eq.${gameId}`,
        },
        async (payload) => {
          console.log("🔴 New comment INSERT event:", payload);
          
          // Fetch the full comment with member details
          const { data: newCommentData, error } = await supabase
            .from("game_comments")
            .select(`
              *,
              member:members!game_comments_member_id_fkey (
                id,
                username,
                full_name,
                avatar_url
              )
            `)
            .eq("id", payload.new.id)
            .single();

          console.log("🔴 Fetched new comment data:", newCommentData, "Error:", error);

          if (newCommentData) {
            setComments((prev) => {
              // Check if comment already exists (prevent duplicates)
              const exists = prev.some(c => c.id === newCommentData.id);
              if (exists) {
                console.log("⚠️ Comment already exists, skipping");
                return prev;
              }
              
              console.log("✅ Adding new comment to state");
              // Add new comment to the beginning of the array
              return [newCommentData as GameCommentWithMember, ...prev];
            });
            
            // Play pop sound for new comments
            playPopSound();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_comments",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          console.log("🔴 Comment UPDATE event:", payload);
          
          // If comment was deleted (deleted_at set), remove from UI
          if (payload.new.deleted_at) {
            console.log("🗑️ Comment deleted, removing from UI");
            setComments((prev) => prev.filter(c => c.id !== payload.new.id));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "game_comments",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          console.log("🔴 Comment DELETE event:", payload);
          setComments((prev) => prev.filter(c => c.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        console.log("🔴 Realtime subscription status:", status);
      });

    // Cleanup subscription on unmount
    return () => {
      console.log("🔴 Unsubscribing from game comments");
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  const handlePostComment = async () => {
    // Use currentMemberId if available, otherwise fallback to member.id from useAuth
    const memberId = currentMemberId || member?.id;
    
    console.log("handlePostComment called - currentMemberId:", currentMemberId, "member.id:", member?.id, "using:", memberId);
    
    if (!memberId) {
      console.error("No member ID available");
      toast({
        title: "Login Required",
        description: "Please login to post comments",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim() && !selectedEmoji) {
      console.log("Comment is empty");
      toast({
        title: "Empty Comment",
        description: "Please enter a comment or select an emoji",
        variant: "destructive",
      });
      return;
    }

    setIsPosting(true);
    try {
      console.log("Posting comment with:", {
        gameId,
        memberId,
        text: newComment.trim() || undefined,
        emoji: selectedEmoji || undefined
      });
      
      await gameCommentService.postComment(gameId, memberId, {
        text: newComment.trim() || undefined,
        emoji: selectedEmoji || undefined,
        isAnimated: selectedEmoji ? BOWLING_EMOJIS[selectedEmoji as keyof typeof BOWLING_EMOJIS]?.animated : false,
      });

      console.log("Comment posted successfully!");
      
      setNewComment("");
      setSelectedEmoji(null);
      
      toast({
        title: "Comment Posted!",
        description: "Your comment is now live",
      });
    } catch (error: any) {
      console.error("Error posting comment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to post comment",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      // Log current user for debugging
      console.log("Delete attempt by user:", { 
        userId: currentUser?.id, 
        isAdmin: isAdmin,
        commentId 
      });

      // Soft delete by updating deleted_at and deleted_by
      const { data, error } = await supabase
        .from("game_comments")
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: currentUser?.id 
        })
        .eq("id", commentId)
        .select();

      console.log("Delete result:", { data, error });

      if (error) {
        console.error("Delete error details:", error);
        throw error;
      }

      // Remove from UI immediately
      setComments(prev => prev.filter(c => c.id !== commentId));
      
      toast({
        title: "Komen Dipadam",
        description: "Komen telah berjaya dipadam."
      });
    } catch (error: any) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Ralat",
        description: error.message || "Gagal memadam komen.",
        variant: "destructive"
      });
    }
  };

  const handleBanUser = async (userId: string, username: string) => {
    try {
      console.log("Ban attempt:", { 
        userId, 
        username, 
        adminId: currentUser?.id, 
        isAdmin 
      });

      if (!isAdmin) {
        toast({
          title: "Tiada Kebenaran",
          description: "Hanya admin boleh ban pengguna.",
          variant: "destructive"
        });
        return;
      }

      if (!currentUser?.id) {
        toast({
          title: "Ralat",
          description: "User tidak dijumpai.",
          variant: "destructive"
        });
        return;
      }

      // Insert into comment_bans table
      const { data, error } = await supabase
        .from("comment_bans")
        .insert({
          member_id: userId,
          banned_by: currentUser.id,
          game_id: gameId, // Ban for specific game
          reason: "Banned by admin from live comments",
          is_active: true
        })
        .select();

      console.log("Ban result:", { data, error });

      // Ignore duplicate ban error (23505 is unique constraint violation)
      if (error && error.code !== '23505') {
        console.error("Ban error details:", error);
        throw error;
      }

      // Remove all visible comments from this user from the UI immediately
      setComments(prev => prev.filter(c => c.member_id !== userId));

      toast({
        title: "Pengguna Diban",
        description: `${username} telah diban dari memberi komen pada game ini.`,
        variant: "destructive"
      });
    } catch (error: any) {
      console.error("Error banning user:", error);
      toast({
        title: "Ralat",
        description: error.message || "Gagal ban pengguna.",
        variant: "destructive"
      });
    }
  };

  const handleEditComment = (comment: GameCommentWithMember) => {
    setEditingCommentId(comment.id);
    setEditText(comment.comment_text || "");
    setEditEmoji(comment.emoji_code || null);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditText("");
    setEditEmoji(null);
  };

  const handleSaveEdit = async (commentId: string) => {
    try {
      if (!editText.trim() && !editEmoji) {
        toast({
          title: "Ralat",
          description: "Komen tidak boleh kosong",
          variant: "destructive"
        });
        return;
      }

      await gameCommentService.editComment(commentId, {
        text: editText.trim() || undefined,
        emoji: editEmoji || undefined,
        isAnimated: editEmoji ? BOWLING_EMOJIS[editEmoji as keyof typeof BOWLING_EMOJIS]?.animated : false,
      });

      // Update local state immediately
      setComments(prev => prev.map(c => 
        c.id === commentId 
          ? { 
              ...c, 
              comment_text: editText.trim() || null,
              emoji_code: editEmoji || null,
              is_animated: editEmoji ? BOWLING_EMOJIS[editEmoji as keyof typeof BOWLING_EMOJIS]?.animated : false,
              edited_at: new Date().toISOString()
            }
          : c
      ));

      handleCancelEdit();

      toast({
        title: "Komen Dikemaskini",
        description: "Komen telah berjaya dikemaskini."
      });
    } catch (error: any) {
      console.error("Error editing comment:", error);
      toast({
        title: "Ralat",
        description: error.message || "Gagal mengemaskini komen.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      {/* Floating Comments Display - Smoky Float Style */}
      {showComments && (
        <div className="fixed bottom-40 right-4 w-[85%] max-w-[400px] space-y-2 pointer-events-none z-40">
          {comments.slice(0, 5).map((comment, index) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 100, x: 0 }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                y: [100, 0, -20, -40],
                x: [0, -8, 8, -5, 0]
              }}
              transition={{
                duration: 6,
                delay: index * 1.5, // 1.5 seconds delay between each comment so they rise one by one
                ease: "easeInOut",
                times: [0, 0.15, 0.85, 1]
              }}
              className="relative flex items-center gap-2 px-4 py-2.5"
              style={{
                animation: "smokyFloat 6s ease-in-out forwards",
                animationDelay: `${index * 1.5}s` // Stagger by 1.5 seconds
              }}
            >
              {/* Truly transparent - NO background, NO border, just text! */}
              {/* Display emoji icon if available */}
              {comment.emoji_code && (
                <span 
                  className={`text-2xl drop-shadow-lg ${comment.is_animated ? "animate-bounce" : ""}`}
                  style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}
                >
                  {BOWLING_EMOJIS[comment.emoji_code as keyof typeof BOWLING_EMOJIS]?.code || comment.emoji_code}
                </span>
              )}
              
              {/* Username */}
              <span 
                className="font-bold text-white text-sm"
                style={{ 
                  textShadow: "2px 2px 4px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(56,189,248,0.8)"
                }}
              >
                {comment.member?.username}:
              </span>

              {/* Comment text */}
              {comment.comment_text && (
                <span 
                  className="text-white text-sm font-bold"
                  style={{ 
                    textShadow: "2px 2px 4px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.8)"
                  }}
                >
                  {comment.comment_text}
                </span>
              )}

              {/* Admin Controls - Only visible to admins and clickable */}
              {isAdmin && (
                <div className="flex items-center gap-1.5 ml-2 pointer-events-auto">
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="p-1.5 rounded-full bg-red-500/90 hover:bg-red-600 transition-colors shadow-lg"
                    title="Delete Comment"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                  <button
                    onClick={() => handleBanUser(comment.member_id, comment.member?.username || "user")}
                    className="p-1.5 rounded-full bg-gray-800/90 hover:bg-black transition-colors shadow-lg"
                    title="Ban User"
                  >
                    <Ban className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Comment Controls - Adjusted higher to bottom-24 to avoid mobile bottom nav */}
      <div className="fixed bottom-24 right-4 z-[90] flex flex-col gap-3 pointer-events-auto">
        {/* Toggle View/Hide Button */}
        <Button
          size="lg"
          onClick={() => setShowComments(!showComments)}
          className="h-12 w-12 rounded-full p-0 shadow-2xl bg-gradient-to-br from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 border-2 border-white/20 transition-all duration-300 hover:scale-110"
        >
          {showComments ? <X className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button 
              size="lg"
              onClick={() => setShowComments(false)}
              className="h-12 px-4 shadow-2xl rounded-full bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-2 border-white/20 transition-all duration-300 hover:scale-110 flex items-center gap-2"
            >
              <Send className="h-5 w-5" />
              <span className="hidden sm:inline font-semibold">Comment</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[72vh] rounded-t-3xl z-[9999] bottom-20 md:bottom-0">
            <SheetHeader>
              <SheetTitle className="text-lg">💬 Live Comments - {gameName}</SheetTitle>
            </SheetHeader>

            <div className="mt-6 flex h-[calc(72vh-4.5rem)] flex-col gap-4 pb-2">
              {/* Emoji Picker - Display ICONS only */}
              <div className="grid grid-cols-5 gap-1.5">
                {Object.entries(BOWLING_EMOJIS).map(([key, emoji]) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={selectedEmoji === key ? "default" : "outline"}
                    onClick={() => setSelectedEmoji(selectedEmoji === key ? null : key)}
                    className={`text-xl h-12 ${emoji.animated ? "hover:animate-bounce" : ""} ${
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
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 border-t pt-4">
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
                      {editingCommentId === comment.id ? (
                        // Edit Mode
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-5 gap-1.5">
                            {Object.entries(BOWLING_EMOJIS).map(([key, emoji]) => (
                              <Button
                                key={key}
                                size="sm"
                                variant={editEmoji === key ? "default" : "outline"}
                                onClick={() => setEditEmoji(editEmoji === key ? null : key)}
                                className={`text-lg h-9 ${emoji.animated ? "hover:animate-bounce" : ""}`}
                              >
                                {emoji.code}
                              </Button>
                            ))}
                          </div>
                          <Input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            placeholder="Edit komen..."
                            maxLength={100}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(comment.id)}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              Simpan
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                              className="flex-1"
                            >
                              Batal
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-sky-600 truncate">
                                {comment.member?.username}
                              </p>
                              {comment.edited_at && (
                                <span className="text-xs text-muted-foreground">(edited)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {comment.emoji_code && (
                                <span className="text-xl">
                                  {BOWLING_EMOJIS[comment.emoji_code as keyof typeof BOWLING_EMOJIS]?.code || comment.emoji_code}
                                </span>
                              )}
                              {comment.comment_text && (
                                <span className="text-sm">{comment.comment_text}</span>
                              )}
                            </div>
                          </div>
                          {/* Edit/Delete buttons - Show for admins OR own comments */}
                          {(isAdmin || comment.member_id === currentMemberId) && (
                            <div className="flex gap-1 flex-shrink-0">
                              {/* Edit button - Only for own comments (not admin editing others) */}
                              {comment.member_id === currentMemberId && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-blue-500 hover:bg-blue-500/10"
                                  onClick={() => handleEditComment(comment)}
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                onClick={() => setCommentToDelete(comment.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              {/* Ban button - Only for admins */}
                              {isAdmin && (
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
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <style jsx>{`
        @keyframes smokyFloat {
          0% {
            transform: translateY(100px) translateX(0px);
            opacity: 0;
          }
          10% {
            opacity: 0.3;
          }
          15% {
            opacity: 1;
            transform: translateY(80px) translateX(-8px);
          }
          30% {
            transform: translateY(60px) translateX(8px);
          }
          45% {
            transform: translateY(40px) translateX(-5px);
          }
          60% {
            transform: translateY(20px) translateX(3px);
          }
          75% {
            transform: translateY(0px) translateX(-2px);
          }
          85% {
            opacity: 1;
            transform: translateY(-10px) translateX(0px);
          }
          95% {
            opacity: 0.5;
            transform: translateY(-30px) translateX(0px);
          }
          100% {
            opacity: 0;
            transform: translateY(-40px) translateX(0px);
          }
        }

        .overflow-y-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}