import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type MiniBlok = Database["public"]["Tables"]["mini_blok"]["Row"];
type MiniBlokInsert = Database["public"]["Tables"]["mini_blok"]["Insert"];
type MiniBlokUpdate = Database["public"]["Tables"]["mini_blok"]["Update"];
type MiniBlokPlayer = Database["public"]["Tables"]["mini_blok_players"]["Row"];
type MiniBlokPlayerInsert = Database["public"]["Tables"]["mini_blok_players"]["Insert"];
type MiniBlokPlayerUpdate = Database["public"]["Tables"]["mini_blok_players"]["Update"];
type MiniBlokCollaborator = Database["public"]["Tables"]["mini_blok_collaborators"]["Row"];

export interface MiniBlokWithPlayers extends MiniBlok {
  players: MiniBlokPlayer[];
  shared_with: MiniBlokCollaborator[];
  can_edit: boolean;
  share_token?: string | null;
}

export interface PlayerStats {
  average: number;
  total_score: number;
  overall_score: number;
  differential: number;
  games_played: number;
}

export interface MiniBlokPublicShared {
  entry: MiniBlok;
  players: MiniBlokPlayer[];
}

function calculatePlayerStats(player: MiniBlokPlayer, numGames: number): PlayerStats {
  const scoresObj = (player.scores as Record<string, number>) || {};
  const scores: number[] = [];
  
  for (let i = 1; i <= numGames; i++) {
    const score = scoresObj[`game_${i}`];
    if (score !== undefined && score !== null && score > 0) {
      scores.push(score);
    }
  }

  const games_played = scores.length;
  
  if (games_played === 0) {
    return { average: 0, total_score: 0, overall_score: 0, differential: 0, games_played: 0 };
  }

  const total_score = scores.reduce((sum, score) => sum + score, 0);
  const average = Math.round(total_score / games_played);
  const overall_score = total_score + ((player.handicap || 0) * games_played);
  const differential = overall_score - total_score;

  return { average, total_score, overall_score, differential, games_played };
}

export async function getMiniBlokEntries(memberId?: string): Promise<MiniBlokWithPlayers[]> {
  const query = supabase
    .from("mini_blok")
    .select(`
      *,
      players:mini_blok_players(*),
      shared_with:mini_blok_collaborators(*),
      shares:mini_blok_shares(token, revoked_at, expires_at)
    `)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const { data, error } = await query;

  console.log("getMiniBlokEntries:", { data, error });

  if (error) {
    console.error("Error fetching mini blok entries:", error);
    throw error;
  }

  const mappedData = (data || []).map(entry => ({
    ...entry,
    players: Array.isArray(entry.players) ? entry.players : [],
    shared_with: Array.isArray(entry.shared_with) ? entry.shared_with : [],
    share_token: Array.isArray(entry.shares) 
      ? entry.shares.find((s: any) => !s.revoked_at && (!s.expires_at || new Date(s.expires_at) > new Date()))?.token || null
      : null,
    can_edit: memberId ? (
      entry.owner_id === memberId || 
      (Array.isArray(entry.shared_with) && entry.shared_with.some((access: MiniBlokCollaborator) => access.member_id === memberId))
    ) : false
  }));

  // Only return entries where the user has access (owner or collaborator)
  return mappedData.filter(entry => entry.can_edit);
}

export async function getMiniBlokById(id: string, memberId?: string): Promise<MiniBlokWithPlayers | null> {
  const { data, error } = await supabase
    .from("mini_blok")
    .select(`
      *,
      players:mini_blok_players(*),
      shared_with:mini_blok_collaborators(*),
      shares:mini_blok_shares(token, revoked_at, expires_at)
    `)
    .eq("id", id)
    .single();

  console.log("getMiniBlokById:", { data, error });

  if (error) {
    console.error("Error fetching mini blok:", error);
    throw error;
  }

  if (!data) return null;

  return {
    ...data,
    players: Array.isArray(data.players) ? data.players : [],
    shared_with: Array.isArray(data.shared_with) ? data.shared_with : [],
    share_token: Array.isArray((data as any).shares) 
      ? (data as any).shares.find((s: any) => !s.revoked_at && (!s.expires_at || new Date(s.expires_at) > new Date()))?.token || null
      : null,
    can_edit: memberId ? (
      data.owner_id === memberId || 
      (Array.isArray(data.shared_with) && data.shared_with.some((access: MiniBlokCollaborator) => access.member_id === memberId))
    ) : false
  };
}

export async function createMiniBlok(entry: MiniBlokInsert): Promise<MiniBlok> {
  console.log("createMiniBlok called with:", entry);
  
  const { data, error } = await supabase
    .from("mini_blok")
    .insert(entry)
    .select()
    .single();

  console.log("createMiniBlok result:", { data, error });

  if (error) {
    console.error("Error creating mini blok:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error details:", error.details);
    console.error("Error hint:", error.hint);
    throw error;
  }

  return data;
}

export async function updateMiniBlok(id: string, updates: MiniBlokUpdate): Promise<MiniBlok> {
  const { data, error } = await supabase
    .from("mini_blok")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  console.log("updateMiniBlok:", { data, error });

  if (error) {
    console.error("Error updating mini blok:", error);
    throw error;
  }

  return data;
}

export async function deleteMiniBlok(id: string): Promise<void> {
  const { error } = await supabase
    .from("mini_blok")
    .delete()
    .eq("id", id);

  console.log("deleteMiniBlok:", { error });

  if (error) {
    console.error("Error deleting mini blok:", error);
    throw error;
  }
}

// Player management
export async function addPlayer(player: MiniBlokPlayerInsert): Promise<MiniBlokPlayer> {
  const { data, error } = await supabase
    .from("mini_blok_players")
    .insert(player)
    .select()
    .single();

  console.log("addPlayer:", { data, error });

  if (error) {
    console.error("Error adding player:", error);
    throw error;
  }

  return data;
}

export async function updatePlayer(id: string, updates: MiniBlokPlayerUpdate): Promise<MiniBlokPlayer> {
  const { data, error } = await supabase
    .from("mini_blok_players")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  console.log("updatePlayer:", { data, error });

  if (error) {
    console.error("Error updating player:", error);
    throw error;
  }

  return data;
}

export async function deletePlayer(id: string): Promise<void> {
  const { error } = await supabase
    .from("mini_blok_players")
    .delete()
    .eq("id", id);

  console.log("deletePlayer:", { error });

  if (error) {
    console.error("Error deleting player:", error);
    throw error;
  }
}

// Access management
export async function shareAccess(miniBlokId: string, userIds: string[]): Promise<void> {
  const inserts = userIds.map(userId => ({
    mini_blok_id: miniBlokId,
    member_id: userId
  }));

  const { error } = await supabase
    .from("mini_blok_collaborators")
    .insert(inserts as any);

  console.log("shareAccess:", { error });

  if (error) {
    console.error("Error sharing access:", error);
    throw error;
  }
}

export async function revokeAccess(miniBlokId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("mini_blok_collaborators")
    .delete()
    .eq("mini_blok_id", miniBlokId)
    .eq("member_id", userId);

  console.log("revokeAccess:", { error });

  if (error) {
    console.error("Error revoking access:", error);
    throw error;
  }
}

export async function revokeShareToken(shareToken: string): Promise<void> {
  const { data, error } = await supabase.rpc("revoke_mini_blok_share" as any, {
    p_token: shareToken,
  } as any);

  console.log("revokeShareToken:", { data, error });

  if (error) {
    console.error("Error revoking share token:", error);
    throw error;
  }
}

export async function generateShareToken(miniBlokId: string): Promise<string> {
  const { data, error } = await supabase.rpc("generate_mini_blok_share" as any, {
    p_mini_blok_id: miniBlokId,
  } as any);

  if (error) {
    console.error("Error generating share token:", error);
    throw error;
  }

  return data as string;
}

export async function getMiniBlokSharedByToken(shareToken: string): Promise<MiniBlokPublicShared | null> {
  const { data, error } = await supabase.rpc("get_mini_blok_shared" as any, {
    p_token: shareToken,
  } as any);

  console.log("getMiniBlokSharedByToken:", { data, error });

  if (error) {
    console.error("Error fetching shared mini blok:", error);
    throw error;
  }

  if (!data) return null;

  const row = data as unknown as {
    mini_blok_id: string;
    title: string | null;
    location: string | null;
    date: string;
    owner_id: string;
    num_games: number | null;
    created_at: string;
    updated_at: string;
    players: unknown;
  };

  if (!row.mini_blok_id) return null;

  const entry: MiniBlok = {
    id: row.mini_blok_id,
    title: row.title,
    location: row.location,
    date: row.date as any,
    owner_id: row.owner_id,
    num_games: row.num_games,
    created_at: row.created_at as any,
    updated_at: row.updated_at as any,
  } as MiniBlok;

  const players = Array.isArray(row.players)
    ? (row.players as MiniBlokPlayer[])
    : typeof row.players === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(row.players);
            return Array.isArray(parsed) ? (parsed as MiniBlokPlayer[]) : [];
          } catch {
            return [];
          }
        })()
      : (row.players as MiniBlokPlayer[]) || [];

  return { entry, players };
}

export function generateShareTokenUrl(shareToken: string): string {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `${baseUrl}/member/mini-blok?share=${encodeURIComponent(shareToken)}`;
}

export function generateShareUrl(entryId: string): string {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `${baseUrl}/member/mini-blok?entry=${entryId}`;
}

export function generateShareText(entry: MiniBlokWithPlayers): string {
  const playerCount = entry.players.length;
  const stats = entry.players.map(p => calculatePlayerStats(p, entry.num_games));
  const topScore = Math.max(...stats.map(s => s.overall_score), 0);
  const topPlayerIndex = stats.findIndex(s => s.overall_score === topScore);
  const topPlayer = topPlayerIndex >= 0 ? entry.players[topPlayerIndex] : null;

  return `🎳 ${entry.title || "Mini Blok Tournament"}

📍 ${entry.location}
📅 ${new Date(entry.date).toLocaleDateString("en-MY")}
🎮 ${entry.num_games} games | 👥 ${playerCount} players

${topPlayer ? `🏆 Top Score: ${topPlayer.player_name} - ${topScore}` : ""}

View full results: ${generateShareUrl(entry.id)}`;
}

export { calculatePlayerStats };