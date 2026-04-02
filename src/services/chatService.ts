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

    // Get member ID - optimized with specific columns
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, full_name")
      .eq("user_id", userId)
      .maybeSingle();

    console.log("🔍 [chatService] Member lookup result:", { 
      memberId: member?.id,
      memberName: member?.full_name,
      memberError: memberError?.message
    });

    if (!member || memberError) {
      console.error("❌ [chatService] Member not found for user_id:", userId, memberError);
      return [];
    }

    const memberId = member.id;
    console.log("🔍 [chatService] Using member_id:", memberId);

    // PRIMARY APPROACH: Query from chat_participants - optimized columns
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
      .eq("member_id", memberId)
      .limit(50); // Limit to 50 most recent rooms

    console.log("🔍 [chatService] Primary query result:", { 
      success: !error, 
      dataCount: data?.length || 0,
      error: error?.message
    });

    if (error) {
      console.error("❌ [chatService] Primary query error:", error);
      
      // FALLBACK: Try alternative approach - also optimized
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
        .eq("participants.member_id", memberId)
        .limit(50);

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
  console.log("🔍 [getChatRoom] Fetching room:", roomId);
  
  try {
    // First, let's verify we have a valid session and member
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      console.error("❌ [getChatRoom] No active session");
      return null;
    }

    const { data: member } = await supabase
      .from("members")
      .select("id, full_name")
      .eq("user_id", session.session.user.id)
      .maybeSingle();

    if (!member) {
      console.error("❌ [getChatRoom] No member found for user");
      return null;
    }

    console.log("🔍 [getChatRoom] Current member:", { id: member.id, name: member.full_name });

    // Check if user is a participant first
    const { data: participant, error: participantError } = await supabase
      .from("chat_participants")
      .select("id, is_banned, is_silenced")
      .eq("room_id", roomId)
      .eq("member_id", member.id)
      .maybeSingle();

    console.log("🔍 [getChatRoom] Participant check:", { 
      isParticipant: !!participant, 
      participantId: participant?.id,
      isBanned: participant?.is_banned,
      isSilenced: participant?.is_silenced,
      error: participantError?.message 
    });

    if (!participant) {
      console.warn("⚠️ [getChatRoom] User is not a participant in this room");
      return null;
    }

    // Now fetch the room details - optimized columns
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
          member:members!chat_participants_member_id_fkey(id, full_name, avatar_url)
        )
      `)
      .eq("id", roomId)
      .limit(1)
      .maybeSingle();

    console.log("🔍 [getChatRoom] Room query result:", { 
      success: !error,
      hasData: !!data,
      roomId: data?.id,
      participantsCount: data?.participants?.length,
      error: error?.message
    });

    if (error || !data) {
      console.error("❌ [getChatRoom] Query error:", error);
      return null;
    }

    // Add the participant's ban/silence status to the room object
    const roomWithStatus: ChatRoomWithDetails = {
      ...data,
      is_banned: participant.is_banned,
      is_silenced: participant.is_silenced,
    } as ChatRoomWithDetails;

    console.log("✅ [getChatRoom] Successfully fetched room");
    return roomWithStatus;
  } catch (error) {
    console.error("❌ [getChatRoom] Unexpected error:", error);
    return null;
  }
}

/**
 * List messages
 */
export async function listMessages(roomId: string, limit = 50): Promise<ChatMessageWithSender[]> {
  console.log("📬 [listMessages] Starting...", { roomId, limit });
  
  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .select(`
        id,
        room_id,
        message,
        created_at,
        sender_id,
        sender:members!chat_messages_sender_id_fkey(id, full_name, avatar_url)
      `)
      .eq("room_id", roomId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    console.log("📬 [listMessages] Query result:", {
      success: !error,
      messageCount: data?.length || 0,
      error: error?.message
    });

    if (error) {
      console.error("❌ [listMessages] Query error:", error);
      return [];
    }

    if (!data) {
      console.warn("⚠️ [listMessages] No data returned");
      return [];
    }

    // Reverse to show oldest first (since we fetched newest first for performance)
    const messages = [...data].reverse();
    
    console.log("✅ [listMessages] Successfully loaded messages:", messages.length);
    return messages as unknown as ChatMessageWithSender[];
  } catch (error) {
    console.error("❌ [listMessages] Unexpected error:", error);
    return [];
  }
}

/**
 * Send a message
 */
export async function sendMessage(roomId: string, content: string): Promise<boolean> {
  console.log("📤 [sendMessage] Starting...", { roomId, contentLength: content.length });
  
  try {
    const memberId = await getCurrentMemberId();
    console.log("📤 [sendMessage] Member ID:", memberId);
    
    if (!memberId) {
      console.error("❌ [sendMessage] No member ID found");
      return false;
    }

    // Check if member is participant and not silenced/banned
    const { data: participant, error: participantError } = await supabase
      .from("chat_participants")
      .select("id, is_banned, is_silenced")
      .eq("room_id", roomId)
      .eq("member_id", memberId)
      .maybeSingle();

    console.log("📤 [sendMessage] Participant check:", {
      hasParticipant: !!participant,
      isBanned: participant?.is_banned,
      isSilenced: participant?.is_silenced,
      error: participantError?.message
    });

    if (!participant) {
      console.error("❌ [sendMessage] User is not a participant in this room");
      return false;
    }

    if (participant.is_banned) {
      console.error("❌ [sendMessage] User is banned from this room");
      return false;
    }

    if (participant.is_silenced) {
      console.error("❌ [sendMessage] User is silenced in this room");
      return false;
    }

    console.log("📤 [sendMessage] Inserting message...");
    const { data: insertedMessage, error } = await supabase
      .from("chat_messages")
      .insert({
        room_id: roomId,
        sender_id: memberId,
        message: content.trim(),
      })
      .select()
      .single();

    console.log("📤 [sendMessage] Insert result:", {
      success: !error,
      messageId: insertedMessage?.id,
      error: error?.message,
      errorCode: error?.code,
      errorDetails: error
    });

    if (error) {
      console.error("❌ [sendMessage] Insert error:", error);
      return false;
    }

    // Verify message was actually saved
    const { data: verifyMessage, error: verifyError } = await supabase
      .from("chat_messages")
      .select("id, message, sender_id, created_at")
      .eq("id", insertedMessage.id)
      .maybeSingle();

    console.log("📤 [sendMessage] Verification result:", {
      found: !!verifyMessage,
      messageId: verifyMessage?.id,
      error: verifyError?.message
    });

    if (!verifyMessage) {
      console.warn("⚠️ [sendMessage] Message inserted but cannot be read back - RLS issue?");
    }

    console.log("✅ [sendMessage] Success!");
    return true;
  } catch (error) {
    console.error("❌ [sendMessage] Unexpected error:", error);
    return false;
  }
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
  console.log("🔔 [subscribeToMessages] Setting up subscription for room:", roomId);
  
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
        console.log("🔔 [subscribeToMessages] New message received:", payload.new);
        
        const { data, error } = await supabase
          .from("chat_messages")
          .select(`
            id,
            room_id,
            message,
            created_at,
            sender_id,
            sender:members!chat_messages_sender_id_fkey(id, full_name, avatar_url)
          `)
          .eq("id", payload.new.id)
          .single();

        console.log("🔔 [subscribeToMessages] Fetched message details:", {
          success: !error,
          hasData: !!data,
          error: error?.message
        });

        if (data) {
          console.log("✅ [subscribeToMessages] Calling callback with new message");
          callback(data as unknown as ChatMessageWithSender);
        } else {
          console.error("❌ [subscribeToMessages] Failed to fetch message details");
        }
      }
    )
    .subscribe((status) => {
      console.log("🔔 [subscribeToMessages] Subscription status:", status);
    });

  return () => {
    console.log("🔔 [subscribeToMessages] Unsubscribing from room:", roomId);
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
    .eq("is_verified", true)
    .order("full_name")
    .limit(200); // Limit to 200 members for performance
  
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