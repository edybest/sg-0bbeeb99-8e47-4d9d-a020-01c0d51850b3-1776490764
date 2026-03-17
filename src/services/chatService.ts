import { supabase } from "@/integrations/supabase/client";

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
 * List all chat rooms for current member
 */
export async function listMyChats(): Promise<ChatRoomWithDetails[]> {
  console.log("🔍 [chatService] listMyChats: Starting...");
  
  const memberId = await getCurrentMemberId();
  console.log("🔍 [chatService] Current member ID for listMyChats:", memberId);
  
  if (!memberId) {
    console.log("❌ [chatService] No member ID, returning empty array");
    return [];
  }

  // Get room base info via RPC
  console.log("🔍 [chatService] Calling RPC: get_member_chat_rooms...");
  
  const { data: rpcRooms, error: rpcError } = await supabase
    .rpc('get_member_chat_rooms', { p_member_id: memberId });

  console.log("🔍 [chatService] RPC result:", { 
    roomCount: rpcRooms?.length || 0,
    rooms: rpcRooms,
    error: rpcError?.message 
  });

  if (rpcError) {
    console.error("❌ [chatService] RPC error:", rpcError);
    return [];
  }

  if (!rpcRooms || rpcRooms.length === 0) {
    console.log("⚠️ [chatService] No rooms returned from RPC");
    return [];
  }

  const roomIds = rpcRooms.map(r => r.room_id);
  console.log("🔍 [chatService] Room IDs to fetch:", roomIds);

  // Fetch full details (participants & last message)
  const { data: roomsData, error: roomsError } = await supabase
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
    .in("id", roomIds);

  console.log("🔍 [chatService] Rooms data fetch:", { 
    count: roomsData?.length || 0,
    error: roomsError?.message 
  });

  if (!roomsData) {
    console.log("❌ [chatService] No rooms data returned");
    return [];
  }

  const rooms = await Promise.all(
    roomsData.map(async (room: any) => {
      // Find the RPC data for this room to get unread_count, is_banned, is_silenced
      const rpcData = rpcRooms.find(r => r.room_id === room.id);
      
      // Get last message
      const { data: lastMsg } = await supabase
        .from("chat_messages")
        .select("message, created_at, sender:members(full_name)")
        .eq("room_id", room.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        ...room,
        unread_count: rpcData?.unread_count || 0,
        is_banned: rpcData?.is_banned || false,
        is_silenced: rpcData?.is_silenced || false,
        last_message: lastMsg as any,
      } as ChatRoomWithDetails;
    })
  );

  // Sort: Lobby Room first, then by last message time
  const sortedRooms = rooms.sort((a, b) => {
    if (a.type === "lobby") return -1;
    if (b.type === "lobby") return 1;
    const aTime = new Date(a.last_message_at || 0).getTime();
    const bTime = new Date(b.last_message_at || 0).getTime();
    return bTime - aTime;
  });

  console.log("✅ [chatService] Final rooms:", { 
    count: sortedRooms.length,
    rooms: sortedRooms.map(r => ({ id: r.id, name: r.name, type: r.type }))
  });

  return sortedRooms;
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