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
  console.log("🔍 [chatService] getCurrentMemberId: Starting...");
  
  const { data: session } = await supabase.auth.getSession();
  console.log("🔍 [chatService] Session:", { 
    hasSession: !!session.session, 
    userId: session.session?.user?.id 
  });
  
  if (!session.session) {
    console.log("❌ [chatService] No session found");
    return null;
  }

  const { data: member, error } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", session.session.user.id)
    .single();

  console.log("🔍 [chatService] Member lookup:", { 
    memberId: member?.id, 
    error: error?.message 
  });

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

  const memberId = await getCurrentMemberId();
  if (!memberId) {
    console.warn("[chatService] listMyChats: no current memberId");
    return [];
  }

  console.log("🔍 [chatService] listMyChats: current memberId", { memberId });

  // Query menggunakan struktur yang sama seperti SQL test yang berjaya
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

  console.log("🔍 [chatService] Query result:", { 
    success: !error, 
    dataCount: data?.length || 0,
    error: error?.message 
  });

  if (error) {
    console.error("[chatService] listMyChats: error querying", error);
    return [];
  }

  if (!data || data.length === 0) {
    console.warn("[chatService] listMyChats: no rooms found");
    return [];
  }

  // Process results
  const roomsMap = new Map<string, ChatRoomSummary>();

  for (const row of data) {
    const room = row.chat_rooms;
    if (!room || roomsMap.has(room.id)) continue;

    let displayName = room.name;

    // For direct chats without a name, fetch the other participant's name
    if (room.type === "direct" && !displayName) {
      const { data: participants } = await supabase
        .from("chat_participants")
        .select("member_id, members!chat_participants_member_id_fkey(full_name)")
        .eq("room_id", room.id)
        .neq("member_id", memberId)
        .limit(1)
        .maybeSingle();

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

  console.log("✅ [chatService] listMyChats: result", {
    memberId,
    roomsCount: rooms.length,
    roomNames: rooms.map((r) => r.name),
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