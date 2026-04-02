import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

type GameComment = Database["public"]["Tables"]["game_comments"]["Row"];
type GameCommentInsert = Database["public"]["Tables"]["game_comments"]["Insert"];

interface GameCommentWithMember extends GameComment {
  member?: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
}

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
};