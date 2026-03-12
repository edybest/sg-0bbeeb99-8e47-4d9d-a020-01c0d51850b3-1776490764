import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Notification = Tables<"notifications">;
export type NotificationRecipient = Tables<"notification_recipients">;

export type NotificationAudience =
  | { type: "all_members" }
  | { type: "selected_members"; memberIds: string[] }
  | { type: "blok_players_by_date"; date: string };

type CreateNotificationInput = {
  title: string;
  body: string;
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
    assertNonEmpty(input.body, "Message");

    const payload = {
      audience: input.audience,
    };

    const insertData: TablesInsert<"notifications"> = {
      title: input.title.trim(),
      body: input.body.trim(),
      payload,
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
      })) satisfies Array<TablesInsert<"notification_recipients">>;

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
      })) satisfies Array<TablesInsert<"notification_recipients">>;

      if (recipients.length > 0) {
        const { error: recError } = await supabase.from("notification_recipients").insert(recipients);
        if (recError) throw recError;
      }
    }

    if (input.audience.type === "blok_players_by_date") {
      const { data: rows, error: rpcError } = await supabase.rpc("get_blok_player_member_ids_by_date", {
        target_date: input.audience.date,
      });

      if (rpcError) throw rpcError;

      const memberIds = Array.isArray(rows) ? rows.map((r) => r.member_id).filter(Boolean) : [];

      const recipients = memberIds.map((memberId) => ({
        notification_id: notification.id,
        member_id: memberId,
      })) satisfies Array<TablesInsert<"notification_recipients">>;

      if (recipients.length > 0) {
        const { error: recError } = await supabase.from("notification_recipients").insert(recipients);
        if (recError) throw recError;
      }
    }

    return notification;
  },

  async listMyNotifications(limit = 30) {
    const { data, error } = await supabase
      .from("notification_recipients")
      .select(
        `
        id,
        notification_id,
        member_id,
        is_read,
        read_at,
        created_at,
        notifications (
          id,
          title,
          body,
          payload,
          created_at
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data ?? []).map((row) => ({
      recipient: row,
      notification: Array.isArray(row.notifications) ? row.notifications[0] : row.notifications,
    }));
  },

  async markRead(recipientId: string) {
    const { error } = await supabase
      .from("notification_recipients")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", recipientId);

    if (error) throw error;
  },
};