import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type ChatRoom = Tables<"chat_rooms">;
type ChatMessage = Tables<"chat_messages">;
type ChatParticipant = Tables<"chat_participants">;

export interface ChatRoomWithDetails extends ChatRoom {
  participants: Array<{
    last_read_at: string | null;
    member: {
      id: string;
      full_name: string;
      avatar_url: string | null;
    };
  }>;
  last_message?: {
    message: string;
    created_at: string;
    sender: {
      full_name: string;
    };
  };
  unread_count?: number;
}

export interface ChatMessageWithSender extends ChatMessage {
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
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return null;

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", session.session.user.id)
    .single();

  return member?.id || null;
}

/**
 * Get or ensure Lobby Room exists for all members
 */
export async function ensureLobbyRoom(): Promise<string | null> {
  try {
    const memberId = await getCurrentMemberId();
    if (!memberId) {
      console.error("No member ID found");
      return null;
    }

    // Get lobby room
    const { data: lobby, error: lobbyError } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("name", "Lobby AMBC Club")
      .eq("type", "group")
      .single();

    if (lobbyError) {
      console.error("Error fetching lobby:", lobbyError);
      return null;
    }

    if (!lobby) {
      console.error("Lobby room not found in database");
      return null;
    }

    // Check if already a participant
    const { data: existing } = await supabase
      .from("chat_participants")
      .select("id")
      .eq("room_id", lobby.id)
      .eq("member_id", memberId)
      .maybeSingle();

    // If not a participant, join
    if (!existing) {
      const { error: joinError } = await supabase
        .from("chat_participants")
        .insert({
          room_id: lobby.id,
          member_id: memberId,
        });

      // Ignore duplicate key errors
      if (joinError && joinError.code !== "23505") {
        console.error("Error joining lobby:", joinError);
      }
    }

    return lobby.id;
  } catch (error) {
    console.error("Unexpected error in ensureLobbyRoom:", error);
    return null;
  }
}

/**
 * List all chat rooms for current member
 */
export async function listMyChats(): Promise<ChatRoomWithDetails[]> {
  const memberId = await getCurrentMemberId();
  if (!memberId) return [];

  // Get room IDs first using RPC
  const { data: roomIds, error: roomError } = await supabase
    .rpc('get_member_chat_rooms', { p_member_id: memberId });

  if (roomError || !roomIds || roomIds.length === 0) {
    console.log("No chat rooms found or error:", roomError);
    return [];
  }

  console.log("🔍 RPC returned room IDs:", roomIds);

  // Extract room IDs from the result
  const roomIdArray = roomIds.map((r: { room_id: string }) => r.room_id);
  
  console.log("🔍 Extracted room ID array:", roomIdArray);

  // Get full room details
  const { data, error } = await supabase
    .from("chat_rooms")
    .select(`
      *,
      participants:chat_participants(
        last_read_at,
        member:members(id, full_name, avatar_url)
      )
    `)
    .in('id', roomIdArray)
    .order("last_message_at", { ascending: false });

  if (error) {
    console.error("Error loading chat details:", error);
    return [];
  }

  console.log("🔍 Fetched room details:", data);

  // Fetch last message and unread count for each room
  const rooms = await Promise.all(
    (data || []).map(async (room) => {
      // Get last message
      const { data: lastMsg } = await supabase
        .from("chat_messages")
        .select("message, created_at, sender:members(full_name)")
        .eq("room_id", room.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get unread count based on last_read_at
      const participant = room.participants.find((p: any) => p.member?.id === memberId);
      const lastReadAt = participant ? participant.last_read_at : null;
      
      let count = 0;
      if (lastReadAt) {
        const { count: c } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room.id)
          .gt("created_at", lastReadAt)
          .neq("sender_id", memberId);
        count = c || 0;
      } else {
        const { count: c } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room.id)
          .neq("sender_id", memberId);
        count = c || 0;
      }

      return {
        ...room,
        last_message: lastMsg as any,
        unread_count: count,
      };
    })
  );

  // Sort: Lobby Room first, then by last message time
  const sorted = rooms.sort((a, b) => {
    // Lobby Room always first
    if (a.name === "Lobby AMBC Club") return -1;
    if (b.name === "Lobby AMBC Club") return 1;
    
    // Then by last message time
    const aTime = new Date(a.last_message_at || 0).getTime();
    const bTime = new Date(b.last_message_at || 0).getTime();
    return bTime - aTime;
  });

  return sorted as ChatRoomWithDetails[];
}

/**
 * Get existing direct chat or create new one with another member
 */
export async function getOrCreateDirectChat(otherMemberId: string): Promise<string | null> {
  try {
    // Step 1: Get current user's session with explicit check
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log("Auth session check:", { 
      hasSession: !!session, 
      sessionError,
      userId: session?.user?.id 
    });

    if (sessionError) {
      console.error("Session error:", sessionError);
      return null;
    }

    if (!session?.user) {
      console.error("No authenticated user - user needs to login");
      return null;
    }

    // Step 2: Get current user's member record
    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    console.log("Member lookup:", { 
      memberData, 
      memberError,
      userId: session.user.id 
    });

    if (memberError) {
      console.error("Error fetching member:", memberError);
      return null;
    }

    if (!memberData) {
      console.error("Current user has no member record - profile incomplete");
      return null;
    }

    const myMemberId = memberData.id;

    // Step 3: Validate other member exists
    const { data: otherMember, error: otherMemberError } = await supabase
      .from("members")
      .select("id, full_name")
      .eq("id", otherMemberId)
      .maybeSingle();

    console.log("Other member check:", { otherMember, otherMemberError });

    if (otherMemberError || !otherMember) {
      console.error("Target member not found:", otherMemberId);
      return null;
    }

    console.log("Creating/getting direct chat:", { 
      myMemberId, 
      otherMemberId,
      otherMemberName: otherMember.full_name
    });

    // Step 4: Call RPC function to get or create chat
    const { data: roomId, error: rpcError } = await supabase.rpc("get_or_create_direct_chat", {
      member1_id: myMemberId,
      member2_id: otherMemberId,
    });

    console.log("RPC result:", { roomId, rpcError });

    if (rpcError) {
      console.error("RPC error details:", {
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        code: rpcError.code
      });
      return null;
    }

    if (!roomId) {
      console.error("RPC returned null room ID");
      return null;
    }

    console.log("✅ Direct chat room created/found:", roomId);
    return roomId;
  } catch (err) {
    console.error("Unexpected error in getOrCreateDirectChat:", err);
    return null;
  }
}

/**
 * Get chat room details
 */
export async function getChatRoom(
  roomId: string
): Promise<ChatRoomWithDetails | null> {
  const { data, error } = await supabase
    .from("chat_rooms")
    .select(`
      *,
      participants:chat_participants(
        last_read_at,
        member:members(id, full_name, avatar_url)
      )
    `)
    .eq("id", roomId)
    .single();

  if (error) {
    console.error("Error loading chat room:", error);
    return null;
  }

  return data as unknown as ChatRoomWithDetails;
}

/**
 * List messages in a chat room
 */
export async function listMessages(
  roomId: string,
  limit = 50
): Promise<ChatMessageWithSender[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select(`
      *,
      sender:members(id, full_name, avatar_url)
    `)
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Error loading messages:", error);
    return [];
  }

  return (data || []) as unknown as ChatMessageWithSender[];
}

/**
 * Send a message
 */
export async function sendMessage(
  roomId: string,
  content: string
): Promise<ChatMessage | null> {
  const memberId = await getCurrentMemberId();
  if (!memberId) return null;

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      room_id: roomId,
      sender_id: memberId,
      message: content.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error sending message:", error);
    return null;
  }

  return data;
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(roomId: string): Promise<void> {
  const memberId = await getCurrentMemberId();
  if (!memberId) return;

  const { error } = await supabase
    .from("chat_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("member_id", memberId);

  if (error) {
    console.error("Error marking messages as read:", error);
  }
}

/**
 * Subscribe to new messages in a room (Realtime)
 */
export function subscribeToMessages(
  roomId: string,
  callback: (message: ChatMessageWithSender) => void
) {
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
        // Fetch full message with sender details
        const { data } = await supabase
          .from("chat_messages")
          .select(`
            *,
            sender:members(id, full_name, avatar_url)
          `)
          .eq("id", payload.new.id)
          .single();

        if (data) {
          callback(data as unknown as ChatMessageWithSender);
        }
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * List all members (for starting new chat)
 */
export async function listAllMembers(): Promise<
  Array<{ id: string; full_name: string; avatar_url: string | null }>
> {
  const { data, error } = await supabase
    .from("members")
    .select("id, full_name, avatar_url")
    .order("full_name");

  if (error) {
    console.error("Error loading members:", error);
    return [];
  }

  return data || [];
}

/**
 * Create group chat
 */
export async function createGroupChat(
  name: string,
  memberIds: string[]
): Promise<ChatRoom | null> {
  const memberId = await getCurrentMemberId();
  if (!memberId) return null;

  // Create room
  const { data: room, error: roomError } = await supabase
    .from("chat_rooms")
    .insert({
      type: "group",
      name,
      created_by: memberId,
    })
    .select()
    .single();

  if (roomError) {
    console.error("Error creating group chat:", roomError);
    return null;
  }

  // Add participants (creator + selected members)
  const allMemberIds = Array.from(new Set([memberId, ...memberIds]));
  const { error: participantsError } = await supabase
    .from("chat_participants")
    .insert(
      allMemberIds.map((id) => ({
        room_id: room.id,
        member_id: id,
      }))
    );

  if (participantsError) {
    console.error("Error adding participants:", participantsError);
    return null;
  }

  return room;
}