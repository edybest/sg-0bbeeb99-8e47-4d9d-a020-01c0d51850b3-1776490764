import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TableName = keyof Database["public"]["Tables"];
type Row<T extends TableName> = Database["public"]["Tables"][T]["Row"];
type Insert<T extends TableName> = Database["public"]["Tables"][T]["Insert"];

export type Notification = Row<"notifications">;
export type NotificationRecipient = Row<"notification_recipients">;

export type NotificationAudience =
  | { type: "all_members" }
  | { type: "selected_members"; memberIds: string[] }
  | { type: "blok_players_by_date"; date: string };

type CreateNotificationInput = {
  title: string;
  message: string;
  audience: NotificationAudience;
};

function assertNonEmpty(value: string, label: string) {
  if (!value.trim()) {
    throw new Error(`${label} diperlukan`);
  }
}

export const notificationService = {
  async createNotification(input: CreateNotificationInput) {
    assertNonEmpty(input.title, "Title");
    assertNonEmpty(input.message, "Message");

    const insertData: Insert<"notifications"> = {
      title: input.title.trim(),
      message: input.message.trim(),
      target_type:
        input.audience.type === "all_members"
          ? "all"
          : input.audience.type === "selected_members"
            ? "members"
            : "blok_players_by_date",
      target_date: input.audience.type === "blok_players_by_date" ? input.audience.date : null,
    };

    const { data: notification, error } = await supabase
      .from("notifications")
      .insert(insertData)
      .select("*")
      .single();

    if (error) throw error;

    if (!notification) {
      throw new Error("Notification gagal dicipta");
    }

    if (input.audience.type === "all_members") {
      const { data: memberRows, error: membersError } = await supabase.from("members").select("id");
      if (membersError) throw membersError;

      const recipients = (memberRows ?? []).map((m) => ({
        notification_id: notification.id,
        member_id: m.id,
      })) satisfies Array<Insert<"notification_recipients">>;

      if (recipients.length > 0) {
        const { error: recError } = await supabase.from("notification_recipients").insert(recipients);
        if (recError) throw recError;
      }
    }

    if (input.audience.type === "selected_members") {
      const unique = Array.from(new Set(input.audience.memberIds)).filter(Boolean);
      const recipients = unique.map((memberId) => ({
        notification_id: notification.id,
        member_id: memberId,
      })) satisfies Array<Insert<"notification_recipients">>;

      if (recipients.length > 0) {
        const { error: recError } = await supabase.from("notification_recipients").insert(recipients);
        if (recError) throw recError;
      }
    }

    if (input.audience.type === "blok_players_by_date") {
      const { data: rows, error: playersError } = await supabase
        .from("game_players")
        .select("member_id, games!game_players_game_id_fkey(game_date, game_type)")
        .eq("games.game_date", input.audience.date)
        .eq("games.game_type", "BLOK");

      if (playersError) throw playersError;

      const memberIds = Array.isArray(rows) ? rows.map((r) => r.member_id).filter(Boolean) : [];

      const recipients = memberIds.map((memberId) => ({
        notification_id: notification.id,
        member_id: memberId,
      })) satisfies Array<Insert<"notification_recipients">>;

      if (recipients.length > 0) {
        const { error: recError } = await supabase.from("notification_recipients").insert(recipients);
        if (recError) throw recError;
      }
    }

    return notification as Row<"notifications">;
  },

  async listMyNotifications(limit = 30, offset = 0) {
    const { data, error } = await supabase
      .from("notification_recipients")
      .select(
        `
        notification_id,
        member_id,
        delivered_at,
        read_at,
        notifications (
          id,
          title,
          message,
          created_at
        )
      `
      )
      .order("delivered_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return (data ?? []).map((row) => ({
      recipient: row as Row<"notification_recipients">,
      notification: Array.isArray((row as any).notifications) ? (row as any).notifications[0] : (row as any).notifications,
    }));
  },

  async getTotalCount() {
    const { count, error } = await supabase
      .from("notification_recipients")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Failed to get total count:", error);
      return 0;
    }
    return count ?? 0;
  },

  async getUnreadCount() {
    const { count, error } = await supabase
      .from("notification_recipients")
      .select("*", { count: "exact", head: true })
      .is("read_at", null);

    if (error) {
      console.error("Failed to get unread count:", error);
      return 0;
    }
    return count ?? 0;
  },

  async markRead(notificationId: string, memberId: string) {
    const { error } = await supabase
      .from("notification_recipients")
      .update({ read_at: new Date().toISOString() })
      .eq("notification_id", notificationId)
      .eq("member_id", memberId);

    if (error) throw error;
  },

  async deleteNotification(notificationId: string, memberId: string) {
    const { error } = await supabase
      .from("notification_recipients")
      .delete()
      .eq("notification_id", notificationId)
      .eq("member_id", memberId);

    if (error) throw error;
  },
};