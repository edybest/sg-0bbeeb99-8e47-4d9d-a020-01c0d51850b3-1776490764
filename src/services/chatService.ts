import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export interface ChatParticipant {
  id: string;
  member_id: string;
  is_banned: boolean;
  is_silenced: boolean;
  member: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface ChatRoomWithDetails {
  id: string;
  name: string | null;
  type: "lobby" | "direct" | "group";
  is_public: boolean;
  last_message_at: string | null;
  participants: ChatParticipant[];
  unread_count?: number;
  is_banned?: boolean;
  is_silenced?: boolean;
  last_message?: {
    message: string;
    created_at: string;
    sender: {
      full_name: string;
    };
  };
}

export interface ChatMessageWithSender {
  id: string;
  room_id: string;
  message: string;
  created_at: string;
  sender_id: string;
  sender: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface ChatRoomSummary {
  id: string;
  name: string;
  type: string | null;
  last_message_at: string | null;
}

/**
 * Get current member's ID from auth
 */
async function getCurrentMemberId(): Promise<string | null> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return null;

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", session.session.user.id)
    .maybeSingle();

  return member?.id || null;
}

/**
 * Get or ensure Lobby Room exists for all members
 */
export async function ensureLobbyRoom(): Promise<string | null> {
  console.log("🔍 [chatService] ensureLobbyRoom: Starting...");
  
  try {
    const memberId = await getCurrentMemberId();
    console.log("🔍 [chatService] Current member ID:", memberId);
    
    if (!memberId) {
      console.log("❌ [chatService] No member ID, cannot ensure lobby");
      return null;
    }

    // Get lobby room
    const { data: lobby, error: lobbyError } = await supabase
      .from("chat_rooms")
      .select("id, name, type")
      .eq("type", "lobby")
      .eq("is_public", true)
      .limit(1)
      .maybeSingle();

    console.log("🔍 [chatService] Lobby lookup:", { 
      lobbyId: lobby?.id,
      lobbyName: lobby?.name,
      error: lobbyError?.message 
    });

    if (lobbyError || !lobby) {
      console.log("❌ [chatService] Lobby room not found or error");
      return null;
    }

    // Check if already a participant
    const { data: existing, error: existingError } = await supabase
      .from("chat_participants")
      .select("id")
      .eq("room_id", lobby.id)
      .eq("member_id", memberId)
      .maybeSingle();

    console.log("🔍 [chatService] Participant check:", { 
      exists: !!existing, 
      participantId: existing?.id,
      error: existingError?.message 
    });

    // If not a participant, join
    if (!existing) {
      console.log("➕ [chatService] Adding member to lobby...");
      
      const { error: insertError } = await supabase
        .from("chat_participants")
        .insert({
          room_id: lobby.id,
          member_id: memberId,
        });

      if (insertError) {
        console.log("❌ [chatService] Failed to add to lobby:", insertError.message);
      } else {
        console.log("✅ [chatService] Successfully added to lobby");
      }
    } else {
      console.log("✅ [chatService] Already in lobby");
    }

    return lobby.id;
  } catch (error) {
    console.error("❌ [chatService] Unexpected error in ensureLobbyRoom:", error);
    return null;
  }
}

/**
 * List all chat rooms for current member - OPTIMIZED VERSION
 */
export async function listMyChats(): Promise<ChatRoomSummary[]> {
  console.log("🔍 [chatService] listMyChats: starting");

  try {
    // Get current session and member ID with detailed logging
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    console.log("🔍 [chatService] Session check:", { 
      hasSession: !!session.session, 
      userId: session.session?.user?.id,
      email: session.session?.user?.email,
      sessionError: sessionError?.message
    });

    if (!session.session) {
      console.warn("❌ [chatService] No active session found");
      return [];
    }

    const userId = session.session.user.id;
    console.log("🔍 [chatService] Looking up member for user_id:", userId);

    // Get member ID
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, full_name, user_id")
      .eq("user_id", userId)
      .maybeSingle();

    console.log("🔍 [chatService] Member lookup result:", { 
      memberId: member?.id,
      memberName: member?.full_name,
      memberUserId: member?.user_id,
      memberError: memberError?.message,
      memberErrorDetails: memberError 
    });

    if (!member || memberError) {
      console.error("❌ [chatService] Member not found for user_id:", userId, memberError);
      return [];
    }

    const memberId = member.id;
    console.log("🔍 [chatService] Using member_id:", memberId);

    // PRIMARY APPROACH: Query from chat_participants (most reliable with RLS)
    const { data, error } = await supabase
      .from("chat_participants")
      .select(`
        room_id,
        chat_rooms!inner (
          id,
          name,
          type,
          last_message_at
        )
      `)
      .eq("member_id", memberId);

    console.log("🔍 [chatService] Primary query result:", { 
      success: !error, 
      dataCount: data?.length || 0,
      error: error?.message,
      errorDetails: error,
      rawData: data
    });

    if (error) {
      console.error("❌ [chatService] Primary query error:", error);
      
      // FALLBACK: Try alternative approach
      console.log("🔄 [chatService] Attempting fallback query...");
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("chat_rooms")
        .select(`
          id,
          name,
          type,
          last_message_at,
          participants:chat_participants!inner(member_id)
        `)
        .eq("participants.member_id", memberId);

      console.log("🔍 [chatService] Fallback query result:", {
        success: !fallbackError,
        count: fallbackData?.length || 0,
        error: fallbackError?.message
      });

      if (fallbackError || !fallbackData) {
        console.error("❌ [chatService] Both queries failed");
        return [];
      }

      // Use fallback data
      return processChatRooms(fallbackData.map(room => ({
        room_id: room.id,
        chat_rooms: {
          id: room.id,
          name: room.name,
          type: room.type,
          last_message_at: room.last_message_at
        }
      })), memberId);
    }

    if (!data || data.length === 0) {
      console.warn("⚠️ [chatService] No rooms found for member:", memberId);
      console.warn("⚠️ [chatService] This might indicate RLS blocking or no chat_participants records");
      return [];
    }

    // Process results
    return processChatRooms(data, memberId);
  } catch (error) {
    console.error("❌ [chatService] Unexpected error in listMyChats:", error);
    return [];
  }
}

/**
 * Helper function to process chat room data
 */
async function processChatRooms(
  data: Array<{ room_id: string; chat_rooms: any }>, 
  memberId: string
): Promise<ChatRoomSummary[]> {
  const roomsMap = new Map<string, ChatRoomSummary>();

  for (const row of data) {
    const room = row.chat_rooms;
    if (!room || roomsMap.has(room.id)) continue;

    let displayName = room.name;

    // For direct chats without a name, fetch the other participant's name
    if (room.type === "direct" && !displayName) {
      console.log("🔍 [chatService] Fetching direct chat participant name for room:", room.id);
      
      const { data: participants, error: partError } = await supabase
        .from("chat_participants")
        .select("member_id, members!chat_participants_member_id_fkey(full_name)")
        .eq("room_id", room.id)
        .neq("member_id", memberId)
        .limit(1)
        .maybeSingle();

      console.log("🔍 [chatService] Participant lookup:", {
        success: !partError,
        participantName: participants?.members ? (participants.members as { full_name: string }).full_name : null,
        error: partError?.message
      });

      if (participants?.members) {
        displayName = (participants.members as { full_name: string }).full_name;
      }
    }

    roomsMap.set(room.id, {
      id: room.id,
      name: displayName || (room.type === "direct" ? "Direct Chat" : "Untitled"),
      type: room.type,
      last_message_at: room.last_message_at,
    });
  }

  const rooms = Array.from(roomsMap.values());

  // Sort: lobby first, then by last_message_at desc
  rooms.sort((a, b) => {
    if (a.type === "lobby" && b.type !== "lobby") return -1;
    if (a.type !== "lobby" && b.type === "lobby") return 1;

    if (a.last_message_at && b.last_message_at) {
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    }
    if (a.last_message_at) return -1;
    if (b.last_message_at) return 1;
    return 0;
  });

  console.log("✅ [chatService] processChatRooms: SUCCESS", {
    roomsCount: rooms.length,
    rooms: rooms.map((r) => ({ id: r.id, name: r.name, type: r.type }))
  });

  return rooms;
}

/**
 * Get existing direct chat or create new one
 */
export async function getOrCreateDirectChat(otherMemberId: string): Promise<string | null> {
  try {
    const myMemberId = await getCurrentMemberId();
    if (!myMemberId) return null;

    const { data: roomId, error } = await supabase.rpc("get_or_create_direct_chat", {
      member1_id: myMemberId,
      member2_id: otherMemberId,
    });

    if (error) {
      console.error("RPC error:", error);
      return null;
    }

    return roomId;
  } catch (err) {
    console.error("Error in getOrCreateDirectChat:", err);
    return null;
  }
}

/**
 * Get chat room details
 */
export async function getChatRoom(roomId: string): Promise<ChatRoomWithDetails | null> {
  const { data, error } = await supabase
    .from("chat_rooms")
    .select(`
      id,
      name,
      type,
      is_public,
      last_message_at,
      participants:chat_participants(
        id,
        member_id,
        is_banned,
        is_silenced,
        member:members(id, full_name, avatar_url)
      )
    `)
    .eq("id", roomId)
    .single();

  if (error) return null;

  return data as unknown as ChatRoomWithDetails;
}

/**
 * List messages
 */
export async function listMessages(roomId: string, limit = 100): Promise<ChatMessageWithSender[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select(`
      id,
      room_id,
      message,
      created_at,
      sender_id,
      sender:members(id, full_name, avatar_url)
    `)
    .eq("room_id", roomId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) return [];
  return data as unknown as ChatMessageWithSender[];
}

/**
 * Send a message
 */
export async function sendMessage(roomId: string, content: string): Promise<boolean> {
  const memberId = await getCurrentMemberId();
  if (!memberId) return false;

  const { error } = await supabase
    .from("chat_messages")
    .insert({
      room_id: roomId,
      sender_id: memberId,
      message: content.trim(),
    });

  return !error;
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(roomId: string): Promise<void> {
  const memberId = await getCurrentMemberId();
  if (!memberId) return;

  await supabase
    .from("chat_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("member_id", memberId);
}

/**
 * Subscribe to new messages
 */
export function subscribeToMessages(roomId: string, callback: (message: ChatMessageWithSender) => void) {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `room_id=eq.${roomId}`,
      },
      async (payload) => {
        const { data } = await supabase
          .from("chat_messages")
          .select(`
            id,
            room_id,
            message,
            created_at,
            sender_id,
            sender:members(id, full_name, avatar_url)
          `)
          .eq("id", payload.new.id)
          .single();

        if (data) callback(data as unknown as ChatMessageWithSender);
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * List all members
 */
export async function listAllMembers(): Promise<Array<{ id: string; full_name: string; avatar_url: string | null }>> {
  const { data } = await supabase
    .from("members")
    .select("id, full_name, avatar_url")
    .order("full_name");
  
  return data || [];
}

/**
 * ADMIN: Silence or Unsilence a member in a room
 */
export async function toggleSilenceMember(roomId: string, memberId: string, isSilenced: boolean): Promise<boolean> {
  const { error } = await supabase
    .from("chat_participants")
    .update({ 
      is_silenced: isSilenced,
      silenced_at: isSilenced ? new Date().toISOString() : null
    })
    .eq("room_id", roomId)
    .eq("member_id", memberId);

  return !error;
}

/**
 * ADMIN: Ban or Unban a member from a room
 */
export async function toggleBanMember(roomId: string, memberId: string, isBanned: boolean): Promise<boolean> {
  const { error } = await supabase
    .from("chat_participants")
    .update({ 
      is_banned: isBanned,
      banned_at: isBanned ? new Date().toISOString() : null
    })
    .eq("room_id", roomId)
    .eq("member_id", memberId);

  return !error;
}

/**
 * ADMIN: Delete a message
 */
export async function adminDeleteMessage(messageId: string): Promise<boolean> {
  const memberId = await getCurrentMemberId();
  if (!memberId) return false;

  const { error } = await supabase
    .from("chat_messages")
    .update({ 
      deleted_at: new Date().toISOString(),
      deleted_by: memberId
    })
    .eq("id", messageId);

  return !error;
}