import { createClient } from "@supabase/supabase-js";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Database } from "@/integrations/supabase/database.types";

type FonteWebhookData = {
  device?: string;
  sender?: 
    | string  // Old format: string phone number
    | {       // New format: object with id and isGroup
        id?: string;
        isGroup?: boolean;
      };
  message?: string;
  member?: {
    jid?: string;
    name?: string;
  };
  data?: {
    body?: string;
    from?: string;
  };
  status?: string;
  id?: string;
  // Group message specific fields
  pushname?: string;
  group?: {
    id?: string;
    subject?: string;
  };
  // Alternative field names that Fonnte might use
  phone?: string;
  text?: string;
};

type WebhookResponse = {
  success: boolean;
  message: string;
};

type MemberLookup = Pick<
  Database["public"]["Tables"]["members"]["Row"],
  "id" | "full_name" | "phone" | "handicap" | "is_verified"
>;

type GameLookup = Pick<
  Database["public"]["Tables"]["games"]["Row"],
  "id" | "game_name" | "game_date" | "game_type" | "is_official"
>;

type ParsedBlokCommand =
  | {
      status: "valid";
      isoDate: string;
      rawDate: string;
    }
  | {
      status: "invalid_date";
      rawDate: string;
    }
  | null;

type LeaderboardEntry = {
  rank: number;
  full_name: string;
  overall_score: number;
};

const BLOK_REGISTER_REGEX = /^\s*#blokambc\s+(\d{2})\.(\d{2})\.(\d{4})\s*$/i;
const BLOK_LEADERBOARD_REGEX = /^\s*#blok\s+(\d{2})\.(\d{2})\.(\d{4})\s*$/i;
const FONNTE_API_URL = "https://api.fonnte.com/send";
const FONNTE_TOKEN = process.env.FONNTE_API_TOKEN || "";
const FONNTE_DEVICE_ID = process.env.FONNTE_DEVICE_ID || "";

function extractReplyTarget(webhookData: FonteWebhookData): string {
  if (webhookData.sender) {
    if (typeof webhookData.sender === "object" && webhookData.sender.id) {
      return webhookData.sender.id;
    }

    if (typeof webhookData.sender === "string") {
      return webhookData.sender;
    }
  }

  if (webhookData.phone) {
    return webhookData.phone;
  }

  if (webhookData.data?.from) {
    return webhookData.data.from;
  }

  return "";
}

function extractSender(webhookData: FonteWebhookData): string {
  if (webhookData.member?.jid) {
    return webhookData.member.jid;
  }

  if (typeof webhookData.sender === "string") {
    return webhookData.sender;
  }

  if (
    typeof webhookData.sender === "object" &&
    webhookData.sender.id &&
    webhookData.sender.isGroup !== true
  ) {
    return webhookData.sender.id;
  }

  if (webhookData.phone) {
    return webhookData.phone;
  }

  if (webhookData.data?.from) {
    return webhookData.data.from;
  }

  return "";
}

function extractMessageText(webhookData: FonteWebhookData): string {
  // Try multiple possible locations for message text
  return (
    webhookData.message ||
    webhookData.text ||
    webhookData.data?.body ||
    ""
  );
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeComparablePhone(value: string): string {
  const digits = digitsOnly(value);

  if (!digits) {
    return "";
  }

  if (digits.startsWith("60")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `60${digits.slice(1)}`;
  }

  if (digits.startsWith("1")) {
    return `60${digits}`;
  }

  return digits;
}

function parseBlokRegistration(messageText: string): ParsedBlokCommand {
  const match = messageText.match(BLOK_REGISTER_REGEX);

  if (!match) {
    return null;
  }

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  const isValidDate =
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day;

  const rawDate = `${dayText}.${monthText}.${yearText}`;

  if (!isValidDate) {
    return {
      status: "invalid_date",
      rawDate,
    };
  }

  return {
    status: "valid",
    isoDate: `${yearText}-${monthText}-${dayText}`,
    rawDate,
  };
}

function parseBlokLeaderboard(messageText: string): ParsedBlokCommand {
  const match = messageText.match(BLOK_LEADERBOARD_REGEX);

  if (!match) {
    return null;
  }

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  const isValidDate =
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day;

  const rawDate = `${dayText}.${monthText}.${yearText}`;

  if (!isValidDate) {
    return {
      status: "invalid_date",
      rawDate,
    };
  }

  return {
    status: "valid",
    isoDate: `${yearText}-${monthText}-${dayText}`,
    rawDate,
  };
}

function buildReplyMessage(message: string): string {
  return `🎳 *AMBC CLUB - BLOK*\n\n${message}`;
}

async function getConfiguredFonnteGroupId(
  supabaseAdmin: ReturnType<typeof createClient<Database>>
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("club_settings")
    .select("setting_value")
    .eq("setting_key", "fonnte_group_id")
    .maybeSingle();

  if (error) {
    console.error("❌ Error fetching fonnte_group_id from club_settings:", error);
    return "";
  }

  return data?.setting_value || "";
}

function parseDateVariants(input: string): string | null {
  const trimmed = input.trim();
  
  // Try DD.MM.YYYY
  let match = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  
  // Try DD/MM/YYYY
  match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  
  // Try YYYY-MM-DD
  match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  
  return null;
}

function formatDateMY(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ms-MY", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      weekday: "long"
    }).toUpperCase();
  } catch {
    return dateStr;
  }
}

function getHelpMessage(): string {
  return `📋 *AMBC CLUB - WhatsApp Commands*\n\n` +
    `🎳 *#blok* [tarikh]\n` +
    `   Papar ranking blok lengkap\n` +
    `   Contoh: #blok atau #blok 22.04.2026\n\n` +
    `🏆 *#top5* [tarikh]\n` +
    `   Papar top 5 ranking sahaja\n` +
    `   Contoh: #top5 atau #top5 20.03.2026\n\n` +
    `🎯 *#lane*\n` +
    `   Semak lane anda untuk blok terkini\n\n` +
    `❓ *#help*\n` +
    `   Papar senarai command ini\n\n` +
    `_Powered by AMBC Club_`;
}

async function sendWhatsAppReply(
  replyTarget: string,
  message: string,
  supabaseAdmin?: ReturnType<typeof createClient<Database>>
): Promise<void> {
  const isGroupTarget = replyTarget.includes("@g.us");
  
  let target: string;
  if (isGroupTarget) {
    const configuredGroupId = await getConfiguredFonnteGroupId(supabaseAdmin!);
    target = configuredGroupId || replyTarget;
  } else {
    target = normalizeComparablePhone(replyTarget);
  }

  if (!target) {
    console.warn("⚠️ WhatsApp auto-reply skipped because target is empty");
    return;
  }

  if (!FONNTE_TOKEN) {
    console.warn("⚠️ WhatsApp auto-reply skipped because FONNTE_API_TOKEN is missing");
    return;
  }

  if (isGroupTarget && !FONNTE_DEVICE_ID) {
    console.warn("⚠️ WhatsApp group auto-reply skipped because FONNTE_DEVICE_ID is missing");
    return;
  }

  console.log(`📤 Sending WhatsApp reply to ${isGroupTarget ? "group" : "personal"}:`, target);

  try {
    const requestBody = JSON.stringify({
      target,
      message,
      countryCode: "60",
    });

    console.log("📝 Request endpoint:", FONNTE_API_URL);
    console.log("📝 Request body:", requestBody);

    const response: Response = await fetch(FONNTE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": FONNTE_TOKEN,
        "Content-Type": "application/json",
      },
      body: requestBody,
    });

    const responseText = await response.text();
    console.log("📬 Response status:", response.status);
    console.log("📬 Response body:", responseText);

    if (!response.ok) {
      throw new Error(`Fonnte API error: ${response.status} ${responseText}`);
    }

    console.log("✅ WhatsApp auto-reply sent successfully:", target);
  } catch (error) {
    console.error("❌ Failed to send WhatsApp auto-reply:", error);
    throw error;
  }
}

async function findMatchingMember(
  supabaseAdmin: ReturnType<typeof createClient<Database>>,
  sender: string
): Promise<MemberLookup | null> {
  const normalizedSender = normalizeComparablePhone(sender);

  if (!normalizedSender) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("members")
    .select("id, full_name, phone, handicap, is_verified")
    .eq("is_verified", true);

  if (error) {
    throw error;
  }

  const members = data || [];

  return (
    members.find((member) => normalizeComparablePhone(member.phone) === normalizedSender) || null
  );
}

async function findTargetBlokGame(
  supabaseAdmin: ReturnType<typeof createClient<Database>>,
  isoDate: string
): Promise<{ game: GameLookup | null; reason?: string }> {
  const { data, error } = await supabaseAdmin
    .from("games")
    .select("id, game_name, game_date, game_type, is_official")
    .eq("game_type", "BLOK")
    .eq("game_date", isoDate)
    .order("is_official", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const games = data || [];

  if (games.length === 0) {
    return {
      game: null,
      reason: `Tiada game BLOK ditemui pada tarikh ${isoDate}.`,
    };
  }

  if (games.length === 1) {
    return { game: games[0] };
  }

  const officialGames = games.filter((game) => game.is_official);

  if (officialGames.length === 1) {
    return { game: officialGames[0] };
  }

  return {
    game: null,
    reason: `Terdapat lebih daripada satu game BLOK pada tarikh ${isoDate}. Sila semak di admin.`,
  };
}

async function getBlokLeaderboard(
  supabaseAdmin: ReturnType<typeof createClient<Database>>,
  game: GameLookup
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabaseAdmin
    .from("game_players")
    .select("overall_score, member_id, members(full_name)")
    .eq("game_id", game.id)
    .order("overall_score", { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((entry, index) => ({
    rank: index + 1,
    full_name: (entry.members as { full_name: string } | null)?.full_name || "Unknown",
    overall_score: entry.overall_score || 0,
  }));
}

function formatLeaderboardMessage(
  gameName: string,
  rawDate: string,
  leaderboard: LeaderboardEntry[]
): string {
  if (leaderboard.length === 0) {
    return buildReplyMessage(
      `Tiada senarai juara bagi *${gameName}* pada *${rawDate}*.\n\nBelum ada score yang direkodkan.`
    );
  }

  const medals = ["🥇", "🥈", "🥉"];
  const lines = leaderboard.map((entry) => {
    const medal = entry.rank <= 3 ? medals[entry.rank - 1] : `${entry.rank}.`;
    return `${medal} ${entry.full_name} - *${entry.overall_score}*`;
  });

  const header = `📊 *TOP 10 JUARA*\n${gameName}\n📅 ${rawDate}\n`;
  const divider = "─".repeat(30);

  return buildReplyMessage(`${header}${divider}\n\n${lines.join("\n")}`);
}

async function handleBlokRegistration(
  supabaseAdmin: ReturnType<typeof createClient<Database>>,
  sender: string,
  replyTarget: string,
  parsedCommand: ParsedBlokCommand
): Promise<{ success: boolean; message: string }> {
  if (parsedCommand.status === "invalid_date") {
    const replyMessage = buildReplyMessage(
      `Tarikh *${parsedCommand.rawDate}* tidak sah. Sila guna format *#blokambc dd.mm.yyyy* dengan tarikh yang betul.`
    );

    await sendWhatsAppReply(replyTarget, replyMessage, supabaseAdmin);

    return {
      success: false,
      message: `Tarikh ${parsedCommand.rawDate} tidak sah`,
    };
  }

  const member = await findMatchingMember(supabaseAdmin, sender);

  if (!member) {
    const replyMessage = buildReplyMessage(
      "Nombor WhatsApp anda tidak sepadan dengan mana-mana ahli berdaftar. Sila hubungi admin AMBC."
    );

    await sendWhatsAppReply(replyTarget, replyMessage, supabaseAdmin);
    console.warn("⚠️ No verified member matched sender:", sender);

    return {
      success: false,
      message: "Nombor WhatsApp tidak sepadan dengan mana-mana ahli berdaftar",
    };
  }

  const targetGameResult = await findTargetBlokGame(supabaseAdmin, parsedCommand.isoDate);

  if (!targetGameResult.game) {
    const replyMessage = buildReplyMessage(
      targetGameResult.reason || `Game BLOK untuk ${parsedCommand.rawDate} tidak ditemui.`
    );

    await sendWhatsAppReply(replyTarget, replyMessage, supabaseAdmin);
    console.warn("⚠️ BLOK game lookup failed:", targetGameResult.reason);

    return {
      success: false,
      message: targetGameResult.reason || "Game BLOK tidak ditemui",
    };
  }

  const targetGame = targetGameResult.game;

  const { data: existingPlayer, error: existingPlayerError } = await supabaseAdmin
    .from("game_players")
    .select("id")
    .eq("game_id", targetGame.id)
    .eq("member_id", member.id)
    .maybeSingle();

  if (existingPlayerError) {
    throw existingPlayerError;
  }

  if (existingPlayer) {
    const replyMessage = buildReplyMessage(
      `${member.full_name}, anda sudah berada dalam senarai pemain BLOK untuk *${parsedCommand.rawDate}*.`
    );

    await sendWhatsAppReply(replyTarget, replyMessage, supabaseAdmin);
    console.log(
      `ℹ️ Member ${member.full_name} already registered for BLOK ${parsedCommand.rawDate}`
    );

    return {
      success: true,
      message: `${member.full_name} sudah berada dalam senarai pemain BLOK ${parsedCommand.rawDate}`,
    };
  }

  const { error: insertError } = await supabaseAdmin.from("game_players").insert({
    game_id: targetGame.id,
    member_id: member.id,
    handicap: member.handicap || 0,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      const replyMessage = buildReplyMessage(
        `${member.full_name}, anda sudah berada dalam senarai pemain BLOK untuk *${parsedCommand.rawDate}*.`
      );

      await sendWhatsAppReply(replyTarget, replyMessage, supabaseAdmin);

      return {
        success: true,
        message: `${member.full_name} sudah berada dalam senarai pemain BLOK ${parsedCommand.rawDate}`,
      };
    }

    throw insertError;
  }

  const successReply = buildReplyMessage(
    `${member.full_name}, anda berjaya dimasukkan ke senarai pemain *${targetGame.game_name}* pada *${parsedCommand.rawDate}*.`
  );

  await sendWhatsAppReply(replyTarget, successReply, supabaseAdmin);

  console.log(
    `✅ Registered ${member.full_name} to BLOK game ${targetGame.game_name} on ${parsedCommand.isoDate}`
  );

  return {
    success: true,
    message: `${member.full_name} berjaya dimasukkan ke senarai pemain BLOK ${parsedCommand.rawDate}`,
  };
}

async function handleBlokLeaderboardQuery(
  supabaseAdmin: ReturnType<typeof createClient<Database>>,
  sender: string,
  replyTarget: string,
  parsedCommand: ParsedBlokCommand
): Promise<{ success: boolean; message: string }> {
  if (parsedCommand.status === "invalid_date") {
    const replyMessage = buildReplyMessage(
      `Tarikh *${parsedCommand.rawDate}* tidak sah. Sila guna format *#blok dd.mm.yyyy* dengan tarikh yang betul.`
    );

    await sendWhatsAppReply(replyTarget, replyMessage, supabaseAdmin);

    return {
      success: false,
      message: `Tarikh ${parsedCommand.rawDate} tidak sah`,
    };
  }

  const targetGameResult = await findTargetBlokGame(supabaseAdmin, parsedCommand.isoDate);

  if (!targetGameResult.game) {
    const replyMessage = buildReplyMessage(
      targetGameResult.reason || `Game BLOK untuk ${parsedCommand.rawDate} tidak ditemui.`
    );

    await sendWhatsAppReply(replyTarget, replyMessage, supabaseAdmin);
    console.warn("⚠️ BLOK game lookup failed:", targetGameResult.reason);

    return {
      success: false,
      message: targetGameResult.reason || "Game BLOK tidak ditemui",
    };
  }

  const targetGame = targetGameResult.game;
  const leaderboard = await getBlokLeaderboard(supabaseAdmin, targetGame);
  const leaderboardMessage = formatLeaderboardMessage(
    targetGame.game_name,
    parsedCommand.rawDate,
    leaderboard
  );

  await sendWhatsAppReply(replyTarget, leaderboardMessage, supabaseAdmin);

  console.log(
    `✅ Sent BLOK leaderboard for ${targetGame.game_name} on ${parsedCommand.isoDate} to ${sender}`
  );

  return {
    success: true,
    message: `Leaderboard for BLOK ${parsedCommand.rawDate} sent successfully`,
  };
}

async function handleTop5Command(
  dateStr: string | undefined,
  supabaseAdmin: ReturnType<typeof createClient<Database>>
): Promise<string> {
  let targetDate: string | null = null;

  if (dateStr) {
    targetDate = parseDateVariants(dateStr);
    if (!targetDate) {
      return "❌ Format tarikh tidak sah.\n\nContoh: #top5 20.03.2026";
    }
  }

  const query = supabaseAdmin
    .from("games")
    .select(
      `
      id,
      game_name,
      game_date,
      game_type,
      game_players (
        id,
        member:members!game_players_member_id_fkey (id, username),
        overall_score,
        game1_score,
        game2_score,
        game3_score,
        game4_score,
        game5_score
      )
    `
    )
    .eq("game_type", "blok")
    .order("game_date", { ascending: false });

  if (targetDate) {
    query.eq("game_date", targetDate);
  }

  const { data: games, error } = await query.limit(1).single();

  if (error || !games) {
    return targetDate
      ? `❌ Tiada game BLOK pada ${targetDate}.`
      : "❌ Tiada game BLOK ditemui.";
  }

  const scores = Array.isArray(games.game_players) ? games.game_players : [];
  if (scores.length === 0) {
    return `❌ Game "${games.game_name}" belum ada skor.`;
  }

  const sorted = [...scores].sort((a, b) => {
    if (b.overall_score !== a.overall_score) return b.overall_score - a.overall_score;
    if (b.game5_score !== a.game5_score) return b.game5_score - a.game5_score;
    if (b.game4_score !== a.game4_score) return b.game4_score - a.game4_score;
    if (b.game3_score !== a.game3_score) return b.game3_score - a.game3_score;
    if (b.game2_score !== a.game2_score) return b.game2_score - a.game2_score;
    return b.game1_score - a.game1_score;
  });

  const top5 = sorted.slice(0, 5);

  let reply = `🏆 *TOP 5 - ${games.game_name}*\n`;
  reply += `📅 ${formatDateMY(games.game_date)}\n\n`;
  reply += `${"─".repeat(30)}\n`;

  top5.forEach((entry, idx) => {
    const rank = idx + 1;
    const username = entry.member.username.toUpperCase();
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🏅";
    reply += `${medal} ${rank}. ${username} - ${entry.overall_score}\n`;
  });

  reply += `${"─".repeat(30)}\n`;
  reply += `_Total pemain: ${sorted.length}_`;
  return reply;
}

async function handleLaneCommand(
  sender: string,
  supabaseAdmin: ReturnType<typeof createClient<Database>>
): Promise<string> {
  // Normalize phone number
  const normalizedPhone = normalizeComparablePhone(sender);

  // Find member by phone
  const { data: member, error: memberError } = await supabaseAdmin
    .from("members")
    .select("id, username")
    .eq("phone_number", normalizedPhone)
    .maybeSingle();

  if (memberError || !member) {
    return "❌ Nombor telefon anda tidak dijumpai dalam sistem AMBC.\n\nSila hubungi admin untuk pendaftaran.";
  }

  // Get latest blok game
  const { data: latestGame, error: gameError } = await supabaseAdmin
    .from("games")
    .select("id, game_name, game_date")
    .eq("game_type", "blok")
    .order("game_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (gameError || !latestGame) {
    return "❌ Tiada game BLOK ditemui.";
  }

  // Check if member joined this game
  const { data: score, error: scoreError } = await supabaseAdmin
    .from("game_players")
    .select("id")
    .eq("game_id", latestGame.id)
    .eq("member_id", member.id)
    .maybeSingle();

  if (scoreError || !score) {
    return `❌ Anda tidak join blok terkini.\n\n*${latestGame.game_name}*\n📅 ${formatDateMY(latestGame.game_date)}`;
  }

  // Check lane assignment
  const { data: laneAssignment, error: laneError } = await supabaseAdmin
    .from("lane_assignments")
    .select("lane_position, game_id")
    .eq("member_id", member.id)
    .eq("game_id", latestGame.id)
    .maybeSingle();

  if (laneError || !laneAssignment) {
    return `⚠️ Anda belum mendapat lane untuk blok terkini.\n\n` +
      `*${latestGame.game_name}*\n` +
      `📅 ${formatDateMY(latestGame.game_date)}\n\n` +
      `Sila layari:\n` +
      `🔗 http://ambc.club/member/undi-lane\n\n` +
      `untuk undi lane anda.`;
  }

  return `🎯 *Lane Anda*\n\n` +
    `*${latestGame.game_name}*\n` +
    `📅 ${formatDateMY(latestGame.game_date)}\n\n` +
    `Lane Position: *${laneAssignment.lane_position}*\n\n` +
    `_Selamat bermain! 🎳_`;
}

async function handleBlokCommand(
  dateStr: string | undefined,
  supabaseAdmin: ReturnType<typeof createClient<Database>>,
  compact = false
): Promise<string> {
  let targetDate: string | null = null;

  if (dateStr) {
    targetDate = parseDateVariants(dateStr);
    if (!targetDate) {
      return "❌ Format tarikh tidak sah.\n\nContoh: #blok 22.04.2026";
    }
  }

  const query = supabaseAdmin
    .from("games")
    .select(
      `
      id,
      game_name,
      game_date,
      game_type,
      scores (
        id,
        member:members!scores_member_id_fkey (id, username),
        overall_score,
        game1_score,
        game2_score,
        game3_score,
        game4_score,
        game5_score
      )
    `
    )
    .eq("game_type", "blok")
    .order("game_date", { ascending: false });

  if (targetDate) {
    query.eq("game_date", targetDate);
  }

  const { data: games, error } = await query.limit(1).single();

  if (error || !games) {
    return targetDate
      ? `❌ Tiada game BLOK pada ${targetDate}.`
      : "❌ Tiada game BLOK ditemui.";
  }

  const scores = Array.isArray(games.scores) ? games.scores : [];
  if (scores.length === 0) {
    return `❌ Game "${games.game_name}" belum ada skor.`;
  }

  const sorted = [...scores].sort((a, b) => {
    if (b.overall_score !== a.overall_score) return b.overall_score - a.overall_score;
    if (b.game5_score !== a.game5_score) return b.game5_score - a.game5_score;
    if (b.game4_score !== a.game4_score) return b.game4_score - a.game4_score;
    if (b.game3_score !== a.game3_score) return b.game3_score - a.game3_score;
    if (b.game2_score !== a.game2_score) return b.game2_score - a.game2_score;
    return b.game1_score - a.game1_score;
  });

  const topScore = sorted[0]?.overall_score ?? 0;

  let reply = `🎳 *${games.game_name}*\n`;
  reply += `📅 ${formatDateMY(games.game_date)}\n\n`;

  if (compact) {
    // Compact mode: username + overall score sahaja
    reply += `📊 *Ranking Blok:*\n`;
    reply += `${"─".repeat(30)}\n`;
    sorted.forEach((entry, idx) => {
      const rank = idx + 1;
      const diff = topScore - entry.overall_score;
      const username = entry.member.username.toUpperCase();
      reply += `${rank}. ${username} - ${entry.overall_score}`;
      if (diff > 0) {
        reply += ` (-${diff})`;
      }
      reply += `\n`;
    });
  } else {
    // Full mode: semua details
    reply += `📊 *Ranking Blok:*\n`;
    reply += `${"─".repeat(30)}\n`;
    sorted.forEach((entry, idx) => {
      const rank = idx + 1;
      const diff = topScore - entry.overall_score;
      const username = entry.member.username.toUpperCase();
      reply += `${rank}. ${username}\n`;
      reply += `   G1:${entry.game1_score} G2:${entry.game2_score} G3:${entry.game3_score} G4:${entry.game4_score} G5:${entry.game5_score}\n`;
      reply += `   Total: ${entry.total_score} | H/C: ${entry.handicap}\n`;
      reply += `   *Overall: ${entry.overall_score}*`;
      if (diff > 0) {
        reply += ` (-${diff})`;
      }
      reply += `\n\n`;
    });
  }

  reply += `\n_Total pemain: ${sorted.length}_`;
  return reply;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WebhookResponse>
) {
  console.log("\n🔔 Webhook received at:", new Date().toISOString());

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  let sender = "";
  let replyTarget = "";
  let shouldReply = false;

  try {
    const webhookData = req.body as FonteWebhookData;
    
    console.log("📥 Webhook payload:", JSON.stringify(webhookData, null, 2));
    
    sender = extractSender(webhookData);
    replyTarget = extractReplyTarget(webhookData);
    
    console.log("👤 Extracted sender:", sender);
    console.log("📍 Extracted reply target:", replyTarget);
    const messageText = extractMessageText(webhookData);
    const status = webhookData.status;
    
    const parsedRegistration = parseBlokRegistration(messageText);
    const parsedLeaderboard = parseBlokLeaderboard(messageText);
    shouldReply = parsedRegistration !== null || parsedLeaderboard !== null;

    // DETAILED LOGGING - Log semua webhook incoming untuk debugging
    // Fonnte format: sender.isGroup indicates if message is from group
    const isGroupMessage = 
      (typeof webhookData.sender === "object" && webhookData.sender.isGroup === true) ||
      !!(webhookData.group?.id) ||
      (typeof webhookData.sender === "string" && webhookData.sender.includes("@g.us"));
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      sender: sender || "unknown",
      senderRaw: typeof webhookData.sender === "object" 
        ? JSON.stringify(webhookData.sender) 
        : webhookData.sender || "unknown",
      message: messageText || "empty",
      status: status || "no-status",
      device: webhookData.device || "unknown",
      isGroup: isGroupMessage,
      groupId: webhookData.group?.id || 
        (typeof webhookData.sender === "object" && webhookData.sender.isGroup ? webhookData.sender.id : "N/A"),
      groupName: webhookData.group?.subject || "N/A",
      pushname: webhookData.pushname || webhookData.member?.name || "N/A",
      fullPayload: JSON.stringify(webhookData, null, 2),
      isBlokCommand: parsedRegistration !== null || parsedLeaderboard !== null,
    };

    console.log("\n=== FONNTE WEBHOOK RECEIVED ===");
    console.log("Timestamp:", logEntry.timestamp);
    console.log("📱 Sender (extracted):", logEntry.sender);
    console.log("📱 Sender (raw):", logEntry.senderRaw);
    console.log("👤 Pushname:", logEntry.pushname);
    console.log("💬 Message:", logEntry.message);
    console.log("📊 Status:", logEntry.status);
    console.log("📱 Device:", logEntry.device);
    console.log("👥 Is Group:", logEntry.isGroup);
    if (isGroupMessage) {
      console.log("🏷️  Group ID:", logEntry.groupId);
      console.log("📝 Group Name:", logEntry.groupName);
    }
    console.log("🎯 Is Blok Command:", logEntry.isBlokCommand);
    console.log("\n📦 Full Payload:");
    console.log(logEntry.fullPayload);
    console.log("=== END WEBHOOK LOG ===\n");

    // Log ke file untuk production debugging (jika dalam production)
    if (process.env.NODE_ENV === "production") {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const logFilePath = path.join(process.cwd(), "logs", "webhook-production.log");
        const groupInfo = isGroupMessage ? `[GROUP:${logEntry.groupId}]` : "[PERSONAL]";
        const logLine = `${logEntry.timestamp} ${groupInfo} | ${logEntry.sender} | ${logEntry.message} | Blok:${logEntry.isBlokCommand}\n`;
        fs.appendFileSync(logFilePath, logLine);
      } catch (logError) {
        console.warn("Failed to write to log file:", logError);
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Supabase admin configuration missing for WhatsApp webhook");

      await sendWhatsAppReply(
        replyTarget,
        buildReplyMessage("Sistem tidak dapat diproses sekarang. Sila cuba sebentar lagi."),
        undefined
      );

      return res.status(200).json({
        success: false,
        message: "Webhook received but Supabase admin configuration is incomplete",
      });
    }

    const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    let result: { success: boolean; message: string };

    if (parsedRegistration) {
      result = await handleBlokRegistration(supabaseAdmin, sender, replyTarget, parsedRegistration);
    } else {
      result = await handleBlokLeaderboardQuery(supabaseAdmin, sender, replyTarget, parsedLeaderboard!);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("\n=== WEBHOOK PROCESSING ERROR ===");
    console.error("Error:", error);

    if (shouldReply && replyTarget) {
      await sendWhatsAppReply(
        replyTarget,
        buildReplyMessage("Sistem tidak dapat diproses sekarang. Sila cuba semula sebentar lagi."),
        undefined
      );
    }

    return res.status(200).json({
      success: false,
      message: "Webhook processing error",
    });
  }
}