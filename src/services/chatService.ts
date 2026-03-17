import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type ChatRoom = Tables<"chat_rooms">;
type ChatMessage = Tables<"chat_messages">;
type ChatParticipant = Tables<"chat_participants">;

export interface ChatRoomWithDetails extends ChatRoom {
  participants: Array<{
    member: {
      id: string;
      full_name: string;
      avatar_url: string | null;
    };
  }>;
  last_message?: {
    content: string;
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
 * List all chat rooms for current member
 */
export async function listMyChats(): Promise<ChatRoomWithDetails[]> {
  const memberId = await getCurrentMemberId();
  if (!memberId) return [];

  const { data, error } = await supabase
    .from("chat_rooms")
    .select(`
      *,
      participants:chat_participants(
        member:members(id, full_name, avatar_url)
      )
    `)
    .eq("chat_participants.member_id", memberId)
    .order("last_message_at", { ascending: false });

  if (error) {
    console.error("Error loading chats:", error);
    return [];
  }

  // Fetch last message and unread count for each room
  const rooms = await Promise.all(
    (data || []).map(async (room) => {
      // Get last message
      const { data: lastMsg } = await supabase
        .from("chat_messages")
        .select("content, created_at, sender:members(full_name)")
        .eq("room_id", room.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // Get unread count
      const { count } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("room_id", room.id)
        .neq("sender_id", memberId)
        .is("read_at", null);

      return {
        ...room,
        last_message: lastMsg || undefined,
        unread_count: count || 0,
      };
    })
  );

  return rooms;
}

/**
 * Get or create direct chat with another member
 */
export async function getOrCreateDirectChat(
  otherMemberId: string
): Promise<ChatRoom | null> {
  const memberId = await getCurrentMemberId();
  if (!memberId) return null;

  const { data, error } = await supabase.rpc("get_or_create_direct_chat", {
    member1: memberId,
    member2: otherMemberId,
  });

  if (error) {
    console.error("Error getting/creating chat:", error);
    return null;
  }

  return data;
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
        member:members(id, full_name, avatar_url)
      )
    `)
    .eq("id", roomId)
    .single();

  if (error) {
    console.error("Error loading chat room:", error);
    return null;
  }

  return data;
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

  return data || [];
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
      content: content.trim(),
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
    .from("chat_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .neq("sender_id", memberId)
    .is("read_at", null);

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
          callback(data as ChatMessageWithSender);
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
    console.error("Error creating group chat:", error);
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