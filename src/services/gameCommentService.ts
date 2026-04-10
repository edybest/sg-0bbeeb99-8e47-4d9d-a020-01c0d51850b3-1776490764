import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

type GameComment = Database["public"]["Tables"]["game_comments"]["Row"];
type GameCommentInsert = Database["public"]["Tables"]["game_comments"]["Insert"];

export interface GameCommentWithMember extends GameComment {
  member?: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export const BOWLING_EMOJIS = {
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

// Helper function to emit debug logs (works on mobile!)
function emitDebugLog(
  type: "success" | "error" | "info" | "warning",
  message: string,
  details?: any
) {
  console.log(`[${type.toUpperCase()}] ${message}`, details);
  const event = new CustomEvent("comment-debug", {
    detail: { type, message, details },
  });
  window.dispatchEvent(event);
}

export const gameCommentService = {
  /**
   * Post a new comment
   */
  async postComment(
    gameId: string,
    memberId: string,
    content: { text?: string; emoji?: string; isAnimated?: boolean }
  ): Promise<GameComment> {
    emitDebugLog("info", "🚀 Memulakan post comment...", { gameId, memberId });
    
    // Get current auth user
    const { data: { user } } = await supabase.auth.getUser();
    emitDebugLog("info", `Auth user: ${user?.id || "None"}`, { userId: user?.id });
    
    // Check if this member_id belongs to current user
    const { data: memberCheck, error: memberCheckError } = await supabase
      .from("members")
      .select("id, user_id, username")
      .eq("id", memberId)
      .single();
    
    if (memberCheckError) {
      emitDebugLog("error", "❌ Member check failed", memberCheckError);
    } else {
      const belongsToUser = memberCheck?.user_id === user?.id;
      emitDebugLog(
        belongsToUser ? "success" : "warning",
        `Member check: ${belongsToUser ? "OK" : "MISMATCH"}`,
        { memberCheck, belongsToUser }
      );
    }
    
    // Check if user is banned
    try {
      const isBanned = await this.isUserBanned(memberId, gameId);
      if (isBanned) {
        emitDebugLog("error", "🚫 User is banned from posting", { memberId, gameId });
        throw new Error("You are banned from posting comments");
      }
      emitDebugLog("success", "✅ User not banned, can post");
    } catch (banCheckError: any) {
      if (banCheckError.message === "You are banned from posting comments") {
        throw banCheckError;
      }
      emitDebugLog("warning", "⚠️ Ban check error (continuing anyway)", banCheckError);
    }

    // Prepare insert data
    const insertData = {
      game_id: gameId,
      member_id: memberId,
      comment_text: content.text || null,
      emoji_code: content.emoji || null,
      is_animated: content.isAnimated || false,
    };
    
    emitDebugLog("info", "📝 Insert data prepared", insertData);
    
    // Attempt insert
    const { data, error } = await supabase
      .from("game_comments")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      emitDebugLog("error", `❌ Insert failed: ${error.message}`, {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    emitDebugLog("success", `✅ Comment posted! ID: ${data.id}`, data);
    return data;
  },

  /**
   * Subscribe to real-time comment updates
   */
  subscribeToGameComments(
    gameId: string,
    callback: (comment: GameCommentWithMember) => void
  ) {
    emitDebugLog("info", `🔌 Connecting real-time for game: ${gameId}`);
    
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
          emitDebugLog("info", "📨 New comment detected!", { commentId: payload.new.id });
          
          try {
            // Fetch the full comment with member details
            const { data, error } = await supabase
              .from("game_comments")
              .select(`
                *,
                member:members!game_comments_member_id_fkey(
                  id,
                  username,
                  full_name,
                  avatar_url
                )
              `)
              .eq("id", payload.new.id)
              .single();

            if (error) {
              emitDebugLog("error", "❌ Failed to fetch comment data", error);
              return;
            }

            if (data) {
              emitDebugLog("success", "✅ Comment fetched, sending to UI", {
                id: data.id,
                hasText: !!data.comment_text,
                hasEmoji: !!data.emoji_code,
                username: data.member?.username,
              });
              callback(data as GameCommentWithMember);
            } else {
              emitDebugLog("warning", "⚠️ No data returned for comment", { commentId: payload.new.id });
            }
          } catch (err) {
            emitDebugLog("error", "❌ Exception in subscription", err);
          }
        }
      )
      .subscribe((status) => {
        emitDebugLog("info", `📡 Subscription status: ${status}`, { gameId, status });
      });

    return () => {
      emitDebugLog("info", `🔌 Disconnecting from game: ${gameId}`);
      supabase.removeChannel(channel);
    };
  },

  /**
   * Get all comments for a game
   */
  async getGameComments(gameId: string): Promise<GameCommentWithMember[]> {
    const { data, error } = await supabase
      .from("game_comments")
      .select(`
        *,
        member:members!game_comments_member_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq("game_id", gameId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching game comments:", error);
      throw error;
    }

    return (data || []) as GameCommentWithMember[];
  },

  /**
   * Get all comments (admin)
   */
  async getAllComments(): Promise<GameCommentWithMember[]> {
    const { data, error } = await supabase
      .from("game_comments")
      .select(`
        *,
        member:members!game_comments_member_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching all comments:", error);
      throw error;
    }

    return (data || []) as GameCommentWithMember[];
  },

  /**
   * Delete a comment (admin version using database function)
   */
  async adminDeleteComment(commentId: string, adminMemberId: string): Promise<void> {
    // Instead of using RPC which might not exist in types,
    // we do a direct update to mark it as deleted.
    // RLS policies will ensure only admins or the owner can do this.
    const { error } = await supabase
      .from("game_comments")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: adminMemberId,
      })
      .eq("id", commentId);

    if (error) {
      console.error("Error deleting comment (admin):", error);
      throw error;
    }
  },

  /**
   * Delete a comment (member version)
   */
  async deleteComment(commentId: string, memberId: string): Promise<void> {
    const { error } = await supabase
      .from("game_comments")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: memberId,
      })
      .eq("id", commentId)
      .eq("member_id", memberId);

    if (error) {
      console.error("Error deleting comment:", error);
      throw error;
    }
  },

  /**
   * Edit a comment
   */
  async editComment(commentId: string, content: { text?: string; emoji?: string; isAnimated?: boolean }): Promise<void> {
    const { error } = await supabase
      .from("game_comments")
      .update({ 
        comment_text: content.text || null,
        emoji_code: content.emoji || null,
        is_animated: content.isAnimated || false
      })
      .eq("id", commentId);

    if (error) {
      console.error("Error editing comment:", error);
      throw error;
    }
  },

  /**
   * Ban a user from posting comments
   */
  async banUser(
    memberId: string,
    gameId?: string,
    bannedBy?: string,
    reason?: string
  ): Promise<void> {
    const { error } = await supabase.from("comment_bans").insert({
      member_id: memberId,
      game_id: gameId || null,
      banned_by: bannedBy || null,
      reason: reason || "Banned by admin",
      is_active: true,
    });

    if (error) {
      console.error("Error banning user:", error);
      throw error;
    }
  },

  /**
   * Unban a user
   */
  async unbanUser(memberId: string): Promise<void> {
    const { error } = await supabase
      .from("comment_bans")
      .update({ is_active: false })
      .eq("member_id", memberId)
      .eq("is_active", true);

    if (error) {
      console.error("Error unbanning user:", error);
      throw error;
    }
  },

  /**
   * Check if a user is banned
   */
  async isUserBanned(memberId: string, gameId?: string): Promise<boolean> {
    const query = supabase
      .from("comment_bans")
      .select("id")
      .eq("member_id", memberId)
      .eq("is_active", true);

    if (gameId) {
      query.or(`game_id.eq.${gameId},game_id.is.null`);
    } else {
      query.is("game_id", null);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error checking ban status:", error);
      return false;
    }

    return (data?.length || 0) > 0;
  },

  /**
   * Get all banned users (admin)
   */
  async getBannedUsers(): Promise<any[]> {
    const { data, error } = await supabase
      .from("comment_bans")
      .select(`
        *,
        member:members!comment_bans_member_id_fkey(
          id,
          username,
          full_name
        )
      `)
      .eq("is_active", true)
      .order("banned_at", { ascending: false });

    if (error) {
      console.error("Error fetching banned users:", error);
      throw error;
    }

    return data || [];
  },
};