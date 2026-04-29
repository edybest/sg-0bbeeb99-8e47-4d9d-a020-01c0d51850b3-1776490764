import type { NextApiRequest, NextApiResponse } from "next";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AdminSupabaseClient = SupabaseClient<Database>;

type BlokGame = {
  id: string;
  game_name: string;
  game_date: string;
  game_type: string | null;
};

type PlayerScoreRow = {
  id: string;
  member_id: string | null;
  game1_score: number | null;
  game2_score: number | null;
  game3_score: number | null;
  game4_score: number | null;
  game5_score: number | null;
  handicap: number | null;
  total_score: number | null;
  overall_score: number | null;
};

type MemberRow = {
  id: string;
  username: string | null;
  full_name: string | null;
};

type LeaderboardEntry = {
  username: string;
  game1_score: number;
  game2_score: number;
  game3_score: number;
  game4_score: number;
  game5_score: number;
  handicap: number;
  total_score: number;
  overall_score: number;
};

const FONNTE_API_URL = "https://api.fonnte.com/send";
const FONNTE_TOKEN = process.env.FONNTE_API_TOKEN || "";

function normalizeComparablePhone(rawPhone: string): string {
  let cleaned = rawPhone.replace(/[@.]/g, "").replace(/\s+/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }
  if (cleaned.startsWith("60")) {
    return cleaned;
  }
  if (cleaned.startsWith("0")) {
    return `60${cleaned.slice(1)}`;
  }
  return cleaned;
}

function parseDateVariants(input: string): string | null {
  const trimmed = input.trim();

  let match = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

function formatDateMY(dateStr: string): string {
  try {
    return new Date(dateStr)
      .toLocaleDateString("ms-MY", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        weekday: "long",
      })
      .toUpperCase();
  } catch {
    return dateStr;
  }
}

function getHelpMessage(): string {
  return `📋 *AMBC CLUB - WhatsApp Commands*\n\n` +
    `🎳 *#blok* [tarikh]\n` +
    `   Papar ranking blok ringkas\n` +
    `   Contoh: #blok atau #blok 22.04.2026\n\n` +
    `🏆 *#top5* [tarikh]\n` +
    `   Papar top 5 ranking sahaja\n` +
    `   Contoh: #top5 atau #top 5 20.03.2026\n\n` +
    `🎯 *#lane*\n` +
    `   Semak lane anda untuk blok terkini\n\n` +
    `❓ *#help*\n` +
    `   Papar senarai command ini\n\n` +
    `_Powered by AMBC Club_`;
}

async function getConfiguredFonnteGroupId(supabaseAdmin: AdminSupabaseClient): Promise<string> {
  const result = await supabaseAdmin
    .from("club_settings")
    .select("setting_value")
    .eq("setting_key", "fonnte_group_id")
    .maybeSingle();

  if (result.error) {
    console.error("❌ Error fetching fonnte_group_id from club_settings:", result.error);
    return "";
  }

  const data = result.data as { setting_value: string | null } | null;
  return data ? (data.setting_value ?? "") : "";
}

async function getLatestBlokGame(
  supabaseAdmin: AdminSupabaseClient,
  dateStr?: string
): Promise<{ game: BlokGame | null; errorMessage: string | null }> {
  let targetDate: string | null = null;

  if (dateStr) {
    targetDate = parseDateVariants(dateStr);
    if (!targetDate) {
      return {
        game: null,
        errorMessage: "❌ Format tarikh tidak sah.\n\nContoh: #blok 22.04.2026",
      };
    }
  }

  let query = supabaseAdmin
    .from("games")
    .select("id, game_name, game_date, game_type")
    .eq("game_type", "blok")
    .order("game_date", { ascending: false });

  if (targetDate) {
    query = query.eq("game_date", targetDate);
  }

  const result = await query.limit(1).maybeSingle();
  if (result.error) {
    console.error("Error fetching blok game:", result.error);
    return {
      game: null,
      errorMessage: targetDate ? `❌ Tiada game BLOK pada ${targetDate}.` : "❌ Tiada game BLOK ditemui.",
    };
  }

  return {
    game: (result.data as BlokGame | null) ?? null,
    errorMessage: result.data ? null : targetDate ? `❌ Tiada game BLOK pada ${targetDate}.` : "❌ Tiada game BLOK ditemui.",
  };
}

async function getLeaderboardEntries(
  supabaseAdmin: AdminSupabaseClient,
  gameId: string
): Promise<LeaderboardEntry[]> {
  const playersResult = await supabaseAdmin
    .from("game_players")
    .select("id, member_id, game1_score, game2_score, game3_score, game4_score, game5_score, handicap, total_score, overall_score")
    .eq("game_id", gameId);

  if (playersResult.error || !playersResult.data) {
    console.error("Error fetching game players:", playersResult.error);
    return [];
  }

  const playerRows = playersResult.data as PlayerScoreRow[];
  const memberIds = playerRows
    .map((row) => row.member_id)
    .filter((memberId): memberId is string => Boolean(memberId));

  const membersMap = new Map<string, MemberRow>();

  if (memberIds.length > 0) {
    const membersResult = await supabaseAdmin
      .from("members")
      .select("id, username, full_name")
      .in("id", memberIds);

    if (membersResult.error) {
      console.error("Error fetching members:", membersResult.error);
    } else {
      const members = (membersResult.data ?? []) as MemberRow[];
      members.forEach((member) => {
        membersMap.set(member.id, member);
      });
    }
  }

  return playerRows
    .map((row) => {
      const member = row.member_id ? membersMap.get(row.member_id) : null;
      return {
        username: (member?.username || member?.full_name || "UNKNOWN").toUpperCase(),
        game1_score: row.game1_score ?? 0,
        game2_score: row.game2_score ?? 0,
        game3_score: row.game3_score ?? 0,
        game4_score: row.game4_score ?? 0,
        game5_score: row.game5_score ?? 0,
        handicap: row.handicap ?? 0,
        total_score: row.total_score ?? 0,
        overall_score: row.overall_score ?? 0,
      };
    })
    .sort((a, b) => {
      if (b.overall_score !== a.overall_score) return b.overall_score - a.overall_score;
      if (b.game5_score !== a.game5_score) return b.game5_score - a.game5_score;
      if (b.game4_score !== a.game4_score) return b.game4_score - a.game4_score;
      if (b.game3_score !== a.game3_score) return b.game3_score - a.game3_score;
      if (b.game2_score !== a.game2_score) return b.game2_score - a.game2_score;
      return b.game1_score - a.game1_score;
    });
}

async function handleBlokCommand(dateStr: string | undefined, supabaseAdmin: AdminSupabaseClient): Promise<string> {
  const { game, errorMessage } = await getLatestBlokGame(supabaseAdmin, dateStr);
  if (!game) {
    return errorMessage ?? "❌ Tiada game BLOK ditemui.";
  }

  const leaderboard = await getLeaderboardEntries(supabaseAdmin, game.id);
  if (leaderboard.length === 0) {
    return `❌ Game "${game.game_name}" belum ada skor.`;
  }

  const topScore = leaderboard[0]?.overall_score ?? 0;
  let reply = `🎳 *${game.game_name}*\n`;
  reply += `📅 ${formatDateMY(game.game_date)}\n\n`;
  reply += `📊 *Ranking Blok:*\n`;
  reply += `${"─".repeat(30)}\n`;

  leaderboard.forEach((entry, index) => {
    const diff = topScore - entry.overall_score;
    reply += `${index + 1}. ${entry.username} - ${entry.overall_score}`;
    if (diff > 0) {
      reply += ` (-${diff})`;
    }
    reply += `\n`;
  });

  reply += `\n_Total pemain: ${leaderboard.length}_`;
  return reply;
}

async function handleTop5Command(dateStr: string | undefined, supabaseAdmin: AdminSupabaseClient): Promise<string> {
  const { game, errorMessage } = await getLatestBlokGame(supabaseAdmin, dateStr);
  if (!game) {
    return errorMessage?.replace("#blok", "#top5") ?? "❌ Tiada game BLOK ditemui.";
  }

  const leaderboard = await getLeaderboardEntries(supabaseAdmin, game.id);
  if (leaderboard.length === 0) {
    return `❌ Game "${game.game_name}" belum ada skor.`;
  }

  const top5 = leaderboard.slice(0, 5);
  let reply = `🏆 *TOP 5 - ${game.game_name}*\n`;
  reply += `📅 ${formatDateMY(game.game_date)}\n\n`;
  reply += `${"─".repeat(30)}\n`;

  top5.forEach((entry, index) => {
    const rank = index + 1;
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🏅";
    reply += `${medal} ${rank}. ${entry.username} - ${entry.overall_score}\n`;
  });

  reply += `${"─".repeat(30)}\n`;
  reply += `_Total pemain: ${leaderboard.length}_`;
  return reply;
}

async function handleLaneCommand(_sender: string, supabaseAdmin: AdminSupabaseClient): Promise<string> {
  const latestGameInfo = await getLatestBlokGame(supabaseAdmin);
  if (!latestGameInfo.game) {
    return "❌ Tiada game BLOK ditemui.";
  }

  const latestGame = latestGameInfo.game;

  return `🎯 *Semakan Lane*\n\n*${latestGame.game_name}*\n📅 ${formatDateMY(latestGame.game_date)}\n\nSila layari:\n🔗 http://ambc.club/member/undi-lane\n\nuntuk semak atau undi lane anda.`;
}

async function processCommand(message: string, sender: string, supabaseAdmin: AdminSupabaseClient): Promise<string> {
  const trimmed = message.trim();
  const lowerMessage = trimmed.toLowerCase();

  if (lowerMessage === "#help") {
    return getHelpMessage();
  }

  const top5Match = lowerMessage.match(/^#top\s*5\s*([\d./-]+)?$/);
  if (top5Match) {
    return handleTop5Command(top5Match[1], supabaseAdmin);
  }

  if (lowerMessage === "#lane") {
    return handleLaneCommand(sender, supabaseAdmin);
  }

  const blokMatch = lowerMessage.match(/^#blok(?:ambc)?\s*([\d./-]+)?$/);
  if (blokMatch) {
    return handleBlokCommand(blokMatch[1], supabaseAdmin);
  }

  return "❌ Command tidak dikenali.\n\nTaip *#help* untuk senarai command.";
}

async function sendWhatsAppReply(
  replyTarget: string,
  message: string,
  supabaseAdmin: AdminSupabaseClient
): Promise<void> {
  const isGroupTarget = replyTarget.includes("@g.us");
  const configuredGroupId = isGroupTarget ? await getConfiguredFonnteGroupId(supabaseAdmin) : "";
  const target = isGroupTarget ? (configuredGroupId || replyTarget) : normalizeComparablePhone(replyTarget);

  if (!target) {
    console.warn("⚠️ WhatsApp auto-reply skipped because target is empty");
    return;
  }

  const response = await fetch(FONNTE_API_URL, {
    method: "POST",
    headers: {
      "Authorization": FONNTE_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target,
      message,
      countryCode: "60",
    }),
  });

  const responseText = await response.text();
  console.log("📬 Response status:", response.status);
  console.log("📬 Response body:", responseText);

  if (!response.ok) {
    throw new Error(`Fonnte API error: ${response.status} ${responseText}`);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceRoleKey || !FONNTE_TOKEN) {
    return res.status(500).json({ success: false, message: "Missing server configuration" });
  }

  const { sender, message } = req.body ?? {};
  if (!sender || !message) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const normalizedMessage = String(message).trim();
  if (!normalizedMessage.startsWith("#")) {
    return res.status(200).json({ success: true, message: "Ignored non-command message" });
  }

  try {
    const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const replyMessage = await processCommand(normalizedMessage, String(sender), supabaseAdmin);

    if (replyMessage) {
      await sendWhatsAppReply(String(sender), replyMessage, supabaseAdmin);
    }

    return res.status(200).json({ success: true, message: "Webhook processed successfully" });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    return res.status(200).json({ success: false, message: "Webhook processing error" });
  }
}