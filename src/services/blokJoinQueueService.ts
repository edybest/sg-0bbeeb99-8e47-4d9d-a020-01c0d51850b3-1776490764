import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type ClubSettingRow = Database["public"]["Tables"]["club_settings"]["Row"];
type QueueRow = Database["public"]["Tables"]["blok_join_queue"]["Row"];

export type BlokJoinQueueEntryInput = {
  displayName: string;
  memberId?: string | null;
};

export type BlokJoinQueueMember = {
  id: string;
  username: string;
  fullName: string;
};

export const BLOK_JOIN_ACTIVE_GAME_KEY = "blok_join_active_game_id";
const MAIN_QUEUE_LIMIT = 42;

function normalizeQueueName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/[*_`~]/g, " ")
    .replace(/[^a-zA-Z0-9/ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function buildQueuePlacement(queuePosition: number): {
  queueGroup: "main" | "waiting";
  displayPosition: number;
} {
  if (queuePosition <= MAIN_QUEUE_LIMIT) {
    return {
      queueGroup: "main",
      displayPosition: queuePosition,
    };
  }

  return {
    queueGroup: "waiting",
    displayPosition: queuePosition - MAIN_QUEUE_LIMIT,
  };
}

export async function setActiveBlokJoinGame(
  supabaseAdmin: SupabaseClient<Database>,
  gameId: string
): Promise<void> {
  const { error } = await supabaseAdmin.from("club_settings").upsert(
    {
      setting_key: BLOK_JOIN_ACTIVE_GAME_KEY,
      setting_value: gameId,
    } satisfies Pick<ClubSettingRow, "setting_key" | "setting_value">,
    {
      onConflict: "setting_key",
    }
  );

  if (error) {
    throw error;
  }
}

export async function getActiveBlokJoinGameId(
  supabaseAdmin: SupabaseClient<Database>
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("club_settings")
    .select("setting_value")
    .eq("setting_key", BLOK_JOIN_ACTIVE_GAME_KEY)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.setting_value || null;
}

export async function seedBlokJoinQueue(
  supabaseAdmin: SupabaseClient<Database>,
  gameId: string,
  entries: BlokJoinQueueEntryInput[]
): Promise<void> {
  const { error: deleteError } = await supabaseAdmin.from("blok_join_queue").delete().eq("game_id", gameId);

  if (deleteError) {
    throw deleteError;
  }

  if (entries.length === 0) {
    return;
  }

  const inserts = entries.map((entry, index) => {
    const queuePosition = index + 1;
    const placement = buildQueuePlacement(queuePosition);

    return {
      game_id: gameId,
      member_id: entry.memberId || null,
      display_name: entry.displayName,
      queue_position: queuePosition,
      queue_group: placement.queueGroup,
      source_type: "admin_import" as const,
    };
  });

  const { error: insertError } = await supabaseAdmin.from("blok_join_queue").insert(inserts);

  if (insertError) {
    throw insertError;
  }
}

export async function getBlokJoinQueueEntries(
  supabaseAdmin: SupabaseClient<Database>,
  gameId: string
): Promise<QueueRow[]> {
  const { data, error } = await supabaseAdmin
    .from("blok_join_queue")
    .select("*")
    .eq("game_id", gameId)
    .order("queue_position", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export function findBlokJoinQueueEntry(
  entries: QueueRow[],
  member: BlokJoinQueueMember
): QueueRow | null {
  const username = normalizeQueueName(member.username);
  const fullName = normalizeQueueName(member.fullName);

  return (
    entries.find((entry) => {
      if (entry.member_id && entry.member_id === member.id) {
        return true;
      }

      const displayName = normalizeQueueName(entry.display_name);

      return Boolean(displayName) && (displayName === username || displayName === fullName);
    }) || null
  );
}

export function hasMemberInBlokJoinQueue(
  entries: QueueRow[],
  member: BlokJoinQueueMember
): boolean {
  return findBlokJoinQueueEntry(entries, member) !== null;
}

export async function appendMemberToBlokJoinQueue(
  supabaseAdmin: SupabaseClient<Database>,
  gameId: string,
  member: BlokJoinQueueMember
): Promise<{
  queuePosition: number;
  queueGroup: "main" | "waiting";
  displayPosition: number;
}> {
  const entries = await getBlokJoinQueueEntries(supabaseAdmin, gameId);
  const queuePosition = entries.length + 1;
  const placement = buildQueuePlacement(queuePosition);

  const { error } = await supabaseAdmin.from("blok_join_queue").insert({
    game_id: gameId,
    member_id: member.id,
    display_name: member.username,
    queue_position: queuePosition,
    queue_group: placement.queueGroup,
    source_type: "join_request",
  });

  if (error) {
    throw error;
  }

  return {
    queuePosition,
    queueGroup: placement.queueGroup,
    displayPosition: placement.displayPosition,
  };
}