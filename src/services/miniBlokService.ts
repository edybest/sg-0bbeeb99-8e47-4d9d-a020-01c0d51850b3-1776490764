import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type MiniBlok = Database["public"]["Tables"]["mini_blok"]["Row"];
type MiniBlokInsert = Database["public"]["Tables"]["mini_blok"]["Insert"];
type MiniBlokUpdate = Database["public"]["Tables"]["mini_blok"]["Update"];

export interface MiniBlokWithStats extends MiniBlok {
  average: number;
  differential: number;
  total_score: number;
  overall_score: number;
}

function calculateStats(games: number[], handicap: number): {
  average: number;
  differential: number;
  total_score: number;
  overall_score: number;
} {
  const validGames = games.filter(g => g > 0);
  const gameCount = validGames.length;
  
  if (gameCount === 0) {
    return { average: 0, differential: 0, total_score: 0, overall_score: 0 };
  }

  const total_score = validGames.reduce((sum, score) => sum + score, 0);
  const average = Math.round(total_score / gameCount);
  const overall_score = total_score + (handicap * gameCount);
  const differential = overall_score - total_score;

  return { average, differential, total_score, overall_score };
}

export async function getMiniBlokEntries(): Promise<MiniBlokWithStats[]> {
  const { data, error } = await supabase
    .from("mini_blok")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  console.log("getMiniBlokEntries:", { data, error });

  if (error) {
    console.error("Error fetching mini blok entries:", error);
    throw error;
  }

  return (data || []).map(entry => {
    const games = [
      entry.game1,
      entry.game2,
      entry.game3,
      entry.game4,
      entry.game5,
      entry.game6,
      entry.game7,
      entry.game8,
      entry.game9,
      entry.game10
    ].filter((g): g is number => g !== null);

    const stats = calculateStats(games, entry.handicap);

    return {
      ...entry,
      ...stats
    };
  });
}

export async function getMiniBlokEntryById(id: string): Promise<MiniBlokWithStats | null> {
  const { data, error } = await supabase
    .from("mini_blok")
    .select("*")
    .eq("id", id)
    .single();

  console.log("getMiniBlokEntryById:", { data, error });

  if (error) {
    console.error("Error fetching mini blok entry:", error);
    throw error;
  }

  if (!data) return null;

  const games = [
    data.game1,
    data.game2,
    data.game3,
    data.game4,
    data.game5,
    data.game6,
    data.game7,
    data.game8,
    data.game9,
    data.game10
  ].filter((g): g is number => g !== null);

  const stats = calculateStats(games, data.handicap);

  return {
    ...data,
    ...stats
  };
}

export async function createMiniBlokEntry(entry: MiniBlokInsert): Promise<MiniBlok> {
  const { data, error } = await supabase
    .from("mini_blok")
    .insert(entry)
    .select()
    .single();

  console.log("createMiniBlokEntry:", { data, error });

  if (error) {
    console.error("Error creating mini blok entry:", error);
    throw error;
  }

  return data;
}

export async function updateMiniBlokEntry(id: string, updates: MiniBlokUpdate): Promise<MiniBlok> {
  const { data, error } = await supabase
    .from("mini_blok")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  console.log("updateMiniBlokEntry:", { data, error });

  if (error) {
    console.error("Error updating mini blok entry:", error);
    throw error;
  }

  return data;
}

export async function deleteMiniBlokEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from("mini_blok")
    .delete()
    .eq("id", id);

  console.log("deleteMiniBlokEntry:", { error });

  if (error) {
    console.error("Error deleting mini blok entry:", error);
    throw error;
  }
}

export function generateShareUrl(entryId: string): string {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `${baseUrl}/member/mini-blok?entry=${entryId}`;
}

export function generateShareText(entry: MiniBlokWithStats): string {
  const games = [
    entry.game1,
    entry.game2,
    entry.game3,
    entry.game4,
    entry.game5,
    entry.game6,
    entry.game7,
    entry.game8,
    entry.game9,
    entry.game10
  ].filter((g): g is number => g !== null);

  const gamesText = games.map((score, idx) => `G${idx + 1}: ${score}`).join(" | ");

  return `🎳 ${entry.title || "Mini Blok"}

📍 ${entry.location}
👤 ${entry.player_name}
📅 ${new Date(entry.date).toLocaleDateString("en-MY")}

${gamesText}

🎯 Average: ${entry.average}
📊 Total: ${entry.total_score}
🎁 Handicap: ${entry.handicap}
✨ Overall: ${entry.overall_score}
📈 Diff: ${entry.differential > 0 ? "+" : ""}${entry.differential}`;
}