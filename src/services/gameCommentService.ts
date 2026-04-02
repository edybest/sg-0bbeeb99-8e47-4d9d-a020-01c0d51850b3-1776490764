import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type GameComment = Database["public"]["Tables"]["game_comments"]["Row"];
type CommentBan = Database["public"]["Tables"]["comment_bans"]["Row"];

export interface GameCommentWithMember extends GameComment {
  member?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface CommentBanWithDetails extends CommentBan {
  member?: {
    id: string;
    username: string;
    full_name: string;
  };
  banned_by_member?: {
    id: string;
    username: string;
    full_name: string;
  };
}

// Bowling-related emojis and animated icons
export const BOWLING_EMOJIS = {
  strike: { code: "🎳", label: "Strike", animated: true },
  spare: { code: "🎯", label: "Spare", animated: true },
  fire: { code: "🔥", label: "On Fire", animated: true },
  star: { code: "⭐", label: "Star", animated: true },
  trophy: { code: "🏆", label: "Trophy", animated: true },
  clap: { code: "👏", label: "Clap", animated: true },
  muscle: { code: "💪", label: "Strong", animated: true },
  thumbsup: { code: "👍", label: "Good", animated: false },
  heart: { code: "❤️", label: "Love", animated: true },
  laugh: { code: "😂", label: "LOL", animated: false },
  cool: { code: "😎", label: "Cool", animated: false },
  wow: { code: "😮", label: "Wow", animated: false },
  perfect: { code: "💯", label: "Perfect", animated: true },
  rocket: { code: "🚀", label: "Rocket", animated: true },
  celebrate: { code: "🎉", label: "Celebrate", animated: true },
};

export const gameCommentService = {
  /**
   * Get all comments (admin only)
   */
  async getAllComments(limit = 100): Promise<any[]> {
    const { data, error } = await supabase
      .from("game_comments")
      .select(`
        *,
        member:members!game_comments_member_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        ),
        game:games(
          game_name,
          game_date
        )
      `)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching all comments:", error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get comments for a specific game (real-time)
   */
  async getGameComments(gameId: string, limit = 50): Promise<GameCommentWithMember[]> {
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
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching game comments:", error);
      throw error;
    }

    return (data || []) as GameCommentWithMember[];
  },

  /**
   * Post a new comment
   */
  async postComment(
    gameId: string,
    memberId: string,
    content: { text?: string; emoji?: string; isAnimated?: boolean }
  ): Promise<GameComment> {
    console.log("=== POST COMMENT DEBUG START ===");
    console.log("Input params:", { gameId, memberId, content });
    
    // Get current auth user for debugging
    const { data: { user } } = await supabase.auth.getUser();
    console.log("Current auth user:", user?.id);
    
    // Check if this member_id belongs to current user
    const { data: memberCheck, error: memberCheckError } = await supabase
      .from("members")
      .select("id, user_id, username")
      .eq("id", memberId)
      .single();
    
    console.log("Member check result:", { memberCheck, memberCheckError });
    console.log("Does member belong to current user?", memberCheck?.user_id === user?.id);
    
    // Check if user is banned first
    try {
      const isBanned = await this.isUserBanned(memberId, gameId);
      console.log("Is user banned?", isBanned);
      
      if (isBanned) {
        throw new Error("You are banned from posting comments");
      }
    } catch (banCheckError) {
      console.error("Error checking ban status:", banCheckError);
      // Continue anyway if ban check fails
    }

    // Prepare insert data
    const insertData = {
      game_id: gameId,
      member_id: memberId,
      comment_text: content.text || null,
      emoji_code: content.emoji || null,
      is_animated: content.isAnimated || false,
    };
    
    console.log("Insert data:", insertData);
    
    // Attempt insert
    const { data, error } = await supabase
      .from("game_comments")
      .insert(insertData)
      .select()
      .single();

    console.log("Insert result:", { data, error });
    console.log("=== POST COMMENT DEBUG END ===");

    if (error) {
      console.error("Error posting comment:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    return data;
  },

  /**
   * Delete a comment (admin only)
   */
  async deleteComment(commentId: string, adminId?: string): Promise<void> {
    let deletedBy = adminId;
    if (!deletedBy) {
      const { data } = await supabase.auth.getSession();
      deletedBy = data.session?.user.id;
    }

    const { error } = await supabase
      .from("game_comments")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
      })
      .eq("id", commentId);

    if (error) {
      console.error("Error deleting comment:", error);
      throw error;
    }
  },

  /**
   * Check if user is banned from posting comments
   */
  async isUserBanned(memberId: string, gameId?: string): Promise<boolean> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("comment_bans")
      .select("*")
      .eq("member_id", memberId)
      .eq("is_active", true)
      .or(`game_id.is.null,game_id.eq.${gameId}`)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .limit(1);

    if (error) {
      console.error("Error checking ban status:", error);
      return false;
    }

    return (data || []).length > 0;
  },

  /**
   * Ban a user from posting comments (admin only)
   */
  async banUser(
    memberId: string,
    bannedBy?: string,
    options: {
      gameId?: string;
      reason?: string;
      expiresAt?: string;
    } = {}
  ): Promise<CommentBan> {
    let adminId = bannedBy;
    if (!adminId) {
      const { data } = await supabase.auth.getSession();
      adminId = data.session?.user.id;
    }

    const { data, error } = await supabase
      .from("comment_bans")
      .insert({
        member_id: memberId,
        game_id: options.gameId || null,
        banned_by: adminId,
        reason: options.reason || null,
        expires_at: options.expiresAt || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error banning user:", error);
      throw error;
    }

    return data;
  },

  /**
   * Unban a user (admin only)
   */
  async unbanUser(banId: string): Promise<void> {
    const { error } = await supabase
      .from("comment_bans")
      .update({ is_active: false })
      .eq("id", banId);

    if (error) {
      console.error("Error unbanning user:", error);
      throw error;
    }
  },

  /**
   * Get all banned users (admin only)
   */
  async getBannedUsers(gameId?: string): Promise<CommentBanWithDetails[]> {
    let query = supabase
      .from("comment_bans")
      .select(`
        *,
        member:members!comment_bans_member_id_fkey(
          id,
          username,
          full_name
        ),
        banned_by_member:members!comment_bans_banned_by_fkey(
          id,
          username,
          full_name
        )
      `)
      .eq("is_active", true)
      .order("banned_at", { ascending: false });

    if (gameId) {
      query = query.eq("game_id", gameId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching banned users:", error);
      throw error;
    }

    return (data || []) as CommentBanWithDetails[];
  },

  /**
   * Subscribe to real-time comment updates
   */
  subscribeToGameComments(
    gameId: string,
    callback: (comment: GameCommentWithMember) => void
  ) {
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
          // Fetch the full comment with member details
          const { data } = await supabase
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

          if (data) {
            callback(data as GameCommentWithMember);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};