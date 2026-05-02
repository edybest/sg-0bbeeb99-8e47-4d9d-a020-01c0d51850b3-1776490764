import type { NextApiRequest, NextApiResponse } from "next";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { writeFileSync, appendFile } from "fs";
import { join } from "path";

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

type JoinLookupMember = {
  id: string;
  username: string;
  full_name: string;
  phone: string;
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

type JoinSessionSummary = {
  game_name: string;
  game_date: string;
  game_time: string | null;
  location: string | null;
  format_details: string | null;
  price: string | null;
};

type JoinParticipantSummary = {
  username: string | null;
  is_paid?: boolean | null;
};

type ParsedAmbcParticipant = {
  name: string;
  is_paid: boolean;
};

type ParsedAmbcSession = {
  game_name: string;
  game_date: string;
  game_time: string;
  location: string;
  format_details: string;
  price: string;
  participants: ParsedAmbcParticipant[];
};

const FONNTE_API_URL = "https://api.fonnte.com/send";
const FONNTE_TOKEN = process.env.FONNTE_API_TOKEN || "";
const DEFAULT_JOIN_FORMAT = "10Pin | 5 Game";
const DEFAULT_JOIN_PRICE = "RM66.00";
const PAYMENT_BANK_NAME = "MAYBANK";
const PAYMENT_BANK_ACCOUNT = "5516 2323 8254";
const PAYMENT_BANK_HOLDER = "Zaaz Beez";

// Production logging helper
function logToFile(message: string) {
  try {
    const logPath = join(process.cwd(), "logs", "webhook-production.log");
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;

    if (process.env.NODE_ENV !== "production") {
      console.log(logLine.trim());
    }

    appendFile(logPath, logLine, (error) => {
      if (error) {
        console.error("Failed to write to log file:", error);
      }
    });
  } catch (error) {
    console.error("Failed to queue log file write:", error);
  }
}

function normalizeComparablePhone(rawPhone: string): string {
  const trimmed = String(rawPhone ?? "").trim();

  if (!trimmed) {
    return "";
  }

  const withoutDomain = trimmed.split("@")[0] ?? "";
  const withoutDeviceSuffix = withoutDomain.split(":")[0] ?? withoutDomain;
  const digitsOnly = withoutDeviceSuffix.replace(/\D/g, "");

  if (!digitsOnly) {
    return "";
  }

  if (digitsOnly.startsWith("60")) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.startsWith("0")) {
    return `+60${digitsOnly.slice(1)}`;
  }

  return `+60${digitsOnly}`;
}

function isPossibleMemberPhoneValue(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed || trimmed.includes("@g.us")) {
    return false;
  }

  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length < 9 || digitsOnly.length > 15) {
    return false;
  }

  return (
    trimmed.includes("@s.whatsapp.net") ||
    trimmed.startsWith("+") ||
    trimmed.startsWith("60") ||
    trimmed.startsWith("0")
  );
}

function extractFallbackPhoneCandidates(payload: unknown): string[] {
  const seenNodes = new WeakSet<object>();
  const candidates = new Set<string>();

  const visit = (value: unknown) => {
    if (typeof value === "string") {
      if (isPossibleMemberPhoneValue(value)) {
        const normalized = normalizeComparablePhone(value);
        if (normalized) {
          candidates.add(normalized);
        }
      }
      return;
    }

    if (!value || typeof value !== "object") {
      return;
    }

    if (seenNodes.has(value as object)) {
      return;
    }

    seenNodes.add(value as object);

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    Object.values(value).forEach(visit);
  };

  visit(payload);
  return Array.from(candidates);
}

async function findMemberByPossiblePhones(
  supabaseAdmin: AdminSupabaseClient,
  possiblePhones: string[]
): Promise<{ member: JoinLookupMember | null; matchedPhone: string }> {
  const normalizedCandidates = Array.from(
    new Set(
      possiblePhones
        .map((value) => normalizeComparablePhone(value))
        .filter(Boolean)
    )
  );

  for (const phone of normalizedCandidates) {
    const exactResult = await supabaseAdmin
      .from("members")
      .select("id, username, full_name, phone")
      .eq("phone", phone)
      .maybeSingle();

    if (exactResult.data) {
      return {
        member: exactResult.data as JoinLookupMember,
        matchedPhone: phone,
      };
    }
  }

  for (const phone of normalizedCandidates) {
    const digitsOnly = phone.replace(/\D/g, "");
    const suffixes = Array.from(
      new Set([
        digitsOnly.slice(-12),
        digitsOnly.slice(-11),
        digitsOnly.slice(-10),
        digitsOnly.slice(-9),
      ].filter((value) => value.length >= 9))
    );

    for (const suffix of suffixes) {
      const fuzzyResult = await supabaseAdmin
        .from("members")
        .select("id, username, full_name, phone")
        .ilike("phone", `%${suffix}`)
        .limit(2);

      if (fuzzyResult.data && fuzzyResult.data.length === 1) {
        return {
          member: fuzzyResult.data[0] as JoinLookupMember,
          matchedPhone: phone,
        };
      }
    }
  }

  return { member: null, matchedPhone: normalizedCandidates[0] ?? "" };
}

async function resolveCommandSenderForGroup(
  supabaseAdmin: AdminSupabaseClient,
  payload: unknown,
  participant?: string
): Promise<string> {
  const directParticipant = normalizeComparablePhone(String(participant ?? ""));
  const fallbackCandidates = extractFallbackPhoneCandidates(payload);
  const candidatePhones = [directParticipant, ...fallbackCandidates].filter(Boolean);

  const { member, matchedPhone } = await findMemberByPossiblePhones(supabaseAdmin, candidatePhones);

  logToFile(
    `Group sender resolution - directParticipant: ${directParticipant || "none"}, fallbackCandidates: ${fallbackCandidates.join(", ") || "none"}, matchedPhone: ${matchedPhone || "none"}, matchedMember: ${member?.username || "none"}`
  );

  return matchedPhone;
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
    `✍️ *#join*\n` +
    `   Sertai blok (bila ada #JOINBLOK aktif)\n\n` +
    `❌ *#cancel*\n` +
    `   Batalkan penyertaan anda daripada list join aktif\n\n` +
    `📋 *#listjoin*\n` +
    `   Papar senarai peserta yang telah join\n\n` +
    `❓ *#help*\n` +
    `   Papar senarai command ini\n\n` +
    `_Powered by AMBC Club_`;
}

function formatJoinSessionDate(dateStr: string): string {
  try {
    const date = new Date(`${dateStr}T00:00:00`);
    const weekday = date
      .toLocaleDateString("ms-MY", { weekday: "long" })
      .toUpperCase();

    const [year, month, day] = dateStr.split("-");
    if (!year || !month || !day) {
      return dateStr;
    }

    return `${weekday} / ${day}.${month}.${year}`;
  } catch {
    return dateStr;
  }
}

function stripWhatsAppFormatting(value: string): string {
  return value.replace(/\*/g, "").replace(/_/g, "").trim();
}

function normalizeMemberNameKey(value: string): string {
  return stripWhatsAppFormatting(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function extractSessionGameName(value: string): string {
  const cleaned = stripWhatsAppFormatting(value);
  const match = cleaned.match(/#?AMBC\s+BLOCK(?:\s*#\d+)?/i);
  return match ? match[0].replace(/^#/, "").replace(/\s+/g, " ").trim() : "";
}

function parseAmbcSyncMessage(message: string): ParsedAmbcSession | null {
  const lines = message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let gameName = "";
  let gameDate = "";
  let gameTime = "";
  let location = "";
  let formatDetails = "";
  let price = "";
  let insideParticipantList = false;
  const participants: ParsedAmbcParticipant[] = [];

  for (const line of lines) {
    const cleaned = stripWhatsAppFormatting(line);

    if (!gameName && line.toLowerCase().includes("#ambc")) {
      gameName = extractSessionGameName(line);
      continue;
    }

    if (line.startsWith("📅")) {
      const dateMatch = cleaned.match(/(\d{2}[./]\d{2}[./]\d{4})/);
      if (dateMatch) {
        const parsedDate = parseDateVariants(dateMatch[1]);
        if (parsedDate) {
          gameDate = parsedDate;
        }
      }
      continue;
    }

    if (line.startsWith("⏰")) {
      gameTime = cleaned.replace("⏰", "").trim();
      continue;
    }

    if (line.startsWith("📍")) {
      location = cleaned.replace("📍", "").trim();
      continue;
    }

    if (line.startsWith("🎳") && !cleaned.toLowerCase().includes("ambc block")) {
      formatDetails = cleaned.replace("🎳", "").trim();
      continue;
    }

    if (line.startsWith("💰")) {
      price = cleaned.replace("💰", "").trim();
      continue;
    }

    if (/^senarai peserta[:]?$/i.test(cleaned)) {
      insideParticipantList = true;
      continue;
    }

    if (insideParticipantList && line.startsWith("⛔️")) {
      break;
    }

    if (insideParticipantList) {
      const participantMatch = cleaned.match(/^\d+\.\s*(.+)$/);
      if (!participantMatch) {
        continue;
      }

      const hasPaidMarker = participantMatch[1].includes("✅");
      const participantName = participantMatch[1].replace(/\s*✅\s*$/u, "").trim();

      if (participantName) {
        participants.push({
          name: participantName,
          is_paid: hasPaidMarker,
        });
      }
    }
  }

  if (!gameName || !gameDate) {
    return null;
  }

  return {
    game_name: gameName,
    game_date: gameDate,
    game_time: gameTime,
    location,
    format_details: formatDetails || DEFAULT_JOIN_FORMAT,
    price: price || DEFAULT_JOIN_PRICE,
    participants,
  };
}

async function resolveParticipantMemberByName(
  supabaseAdmin: AdminSupabaseClient,
  participantName: string
): Promise<JoinLookupMember | null> {
  const usernameResult = await supabaseAdmin
    .from("members")
    .select("id, username, full_name, phone")
    .ilike("username", participantName)
    .maybeSingle();

  if (usernameResult.data) {
    return usernameResult.data as JoinLookupMember;
  }

  const fullNameResult = await supabaseAdmin
    .from("members")
    .select("id, username, full_name, phone")
    .ilike("full_name", participantName)
    .limit(2);

  if (fullNameResult.data && fullNameResult.data.length === 1) {
    return fullNameResult.data[0] as JoinLookupMember;
  }

  return null;
}

function formatJoinParticipantSection(participants: JoinParticipantSummary[]): string {
  if (participants.length === 0) {
    return "1.";
  }

  return participants
    .map((participant, index) => {
      const paidMarker = participant.is_paid ? " ✅" : "";
      return `${index + 1}. ${participant.username || "-"}${paidMarker}`;
    })
    .join("\n");
}

function buildJoinSessionReply(
  session: JoinSessionSummary,
  participants: JoinParticipantSummary[]
): string {
  const formattedDate = formatJoinSessionDate(session.game_date);
  const gameTime = session.game_time || "-";
  const location = session.location || "-";
  const formatDetails = session.format_details || DEFAULT_JOIN_FORMAT;
  const price = session.price || DEFAULT_JOIN_PRICE;
  const participantList = formatJoinParticipantSection(participants);

  return `🎳🔥*${session.game_name}*🔥🎳\n\n` +
    `📅 *${formattedDate}*\n` +
    `⏰ *${gameTime}*\n` +
    `📍 *${location}*\n` +
    `🎳 *${formatDetails}*\n` +
    `💰 *${price}*\n` +
    `💳 Bayaran Online (Diutamakan)\n` +
    `Senang urus lane, mohon settle bayaran sebelum 5.00 petang (*${formattedDate.split(" / ")[0] || "GAME DAY"}*) yaa 🙏\n` +
    `🏦 ${PAYMENT_BANK_NAME}\n` +
    `➡️ ${PAYMENT_BANK_ACCOUNT}\n` +
    `👤 ${PAYMENT_BANK_HOLDER}\n\n` +
    `Senarai peserta:\n\n` +
    `${participantList}\n\n` +
    `⛔️⛔️⛔️⛔️⛔️⛔️⛔️⛔️⛔️⛔️\n\n` +
    `✅ “dah bayar”\n\n` +
    `Terima kasih✌🏻\n\n` +
    `🎳 Strike ke spare ke, janji turun 😆🔥\n` +
    `🚀 JOMMMM RAMAI² TURUN!!! 💪😎\n` +
    `🎳_*Bowling Brings Us Together*_🎳`;
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
    .ilike("game_type", "blok")
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

async function handleJoinBlokCommand(message: string, sender: string, supabaseAdmin: AdminSupabaseClient): Promise<string> {
  const lines = message.split("\n");
  let gameName = "";
  let gameDate = "";
  let gameTime = "";
  let location = "";
  let price = "";
  let formatDetails = DEFAULT_JOIN_FORMAT;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes("*AMBC BLOCK")) {
      const match = trimmed.match(/AMBC BLOCK.*?#(\d+)/i);
      if (match) gameName = `AMBC BLOCK #${match[1]}`;
    }
    if (trimmed.includes("📅")) {
      const dateMatch = trimmed.match(/(\d{2}\.\d{2}\.\d{4})/);
      if (dateMatch) {
        const parsed = parseDateVariants(dateMatch[1]);
        if (parsed) gameDate = parsed;
      }
    }
    if (trimmed.includes("⏰")) {
      gameTime = trimmed.replace("⏰", "").replace("*", "").trim();
    }
    if (trimmed.includes("📍")) {
      location = trimmed.replace("📍", "").replace("*", "").trim();
    }
    if (trimmed.startsWith("🎳") && !trimmed.includes("AMBC BLOCK")) {
      formatDetails = stripWhatsAppFormatting(trimmed.replace("🎳", "")) || DEFAULT_JOIN_FORMAT;
    }
    if (trimmed.includes("💰")) {
      price = trimmed.replace("💰", "").replace("*", "").trim();
    }
  }

  if (!gameName || !gameDate) {
    return "❌ Format mesej tidak lengkap. Pastikan ada nama game dan tarikh.";
  }

  try {
    const configuredGroupId = await getConfiguredFonnteGroupId(supabaseAdmin);
    
    const { data: session, error } = await supabaseAdmin
      .from("whatsapp_join_sessions")
      .insert({
        game_name: gameName,
        game_date: gameDate,
        game_time: gameTime,
        location: location,
        format_details: formatDetails,
        price: price,
        original_message: message,
        fonnte_group_id: configuredGroupId,
        created_by_phone: sender,
        status: "active"
      })
      .select()
      .single();

    if (error) throw error;

    return `✅ *JOIN SESSION DIBUKA*\n\n` +
      `🎳 ${gameName}\n` +
      `📅 ${formatDateMY(gameDate)}\n` +
      `⏰ ${gameTime}\n` +
      `📍 ${location}\n` +
      `💰 ${price}\n\n` +
      `Ahli boleh taip *#join* untuk sertai!`;
  } catch (error) {
    console.error("Error creating join session:", error);
    return "❌ Gagal membuka join session. Sila cuba lagi.";
  }
}

async function handleAmbcSyncCommand(
  message: string,
  supabaseAdmin: AdminSupabaseClient
): Promise<null> {
  const parsedSession = parseAmbcSyncMessage(message);

  if (!parsedSession) {
    logToFile("Unable to parse #ambc sync message");
    return null;
  }

  const sessionResult = await supabaseAdmin
    .from("whatsapp_join_sessions")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const activeSession = sessionResult.data as { id: string } | null;

  if (!activeSession) {
    logToFile("No active join session found for #ambc sync");
    return null;
  }

  const { error: sessionUpdateError } = await supabaseAdmin
    .from("whatsapp_join_sessions")
    .update({
      game_name: parsedSession.game_name,
      game_date: parsedSession.game_date,
      game_time: parsedSession.game_time,
      location: parsedSession.location,
      format_details: parsedSession.format_details,
      price: parsedSession.price,
      original_message: message,
    })
    .eq("id", activeSession.id);

  if (sessionUpdateError) {
    logToFile(`Failed to update active session via #ambc - ${sessionUpdateError.message}`);
    return null;
  }

  const existingParticipantsResult = await supabaseAdmin
    .from("whatsapp_join_participants")
    .select("member_id, phone_number, username")
    .eq("session_id", activeSession.id);

  const existingParticipants = (existingParticipantsResult.data ?? []) as Array<{
    member_id: string;
    phone_number: string;
    username: string;
  }>;

  const existingByName = new Map(
    existingParticipants.map((participant) => [
      normalizeMemberNameKey(participant.username),
      participant,
    ])
  );

  const resolvedParticipants: Array<{
    session_id: string;
    member_id: string;
    phone_number: string;
    username: string;
    is_paid: boolean;
    joined_at: string;
  }> = [];

  const unresolvedNames: string[] = [];
  const baseTime = Date.now();

  for (const [index, participant] of parsedSession.participants.entries()) {
    const normalizedName = normalizeMemberNameKey(participant.name);
    const existingParticipant = existingByName.get(normalizedName);

    if (existingParticipant) {
      resolvedParticipants.push({
        session_id: activeSession.id,
        member_id: existingParticipant.member_id,
        phone_number: existingParticipant.phone_number,
        username: existingParticipant.username,
        is_paid: participant.is_paid,
        joined_at: new Date(baseTime + index * 1000).toISOString(),
      });
      continue;
    }

    const member = await resolveParticipantMemberByName(supabaseAdmin, participant.name);

    if (!member) {
      unresolvedNames.push(participant.name);
      continue;
    }

    resolvedParticipants.push({
      session_id: activeSession.id,
      member_id: member.id,
      phone_number: member.phone,
      username: member.username || participant.name,
      is_paid: participant.is_paid,
      joined_at: new Date(baseTime + index * 1000).toISOString(),
    });
  }

  if (unresolvedNames.length > 0) {
    logToFile(`#ambc unresolved participants: ${unresolvedNames.join(", ")}`);
  }

  const { error: deleteError } = await supabaseAdmin
    .from("whatsapp_join_participants")
    .delete()
    .eq("session_id", activeSession.id);

  if (deleteError) {
    logToFile(`Failed to clear participants during #ambc sync - ${deleteError.message}`);
    return null;
  }

  if (resolvedParticipants.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from("whatsapp_join_participants")
      .insert(resolvedParticipants);

    if (insertError) {
      logToFile(`Failed to insert synced participants during #ambc sync - ${insertError.message}`);
      return null;
    }
  }

  logToFile(
    `#ambc sync completed - session: ${activeSession.id}, participants: ${resolvedParticipants.length}, unresolved: ${unresolvedNames.length}`
  );

  return null;
}

async function handleJoinCommand(sender: string, supabaseAdmin: AdminSupabaseClient): Promise<string> {
  const normalizedPhone = normalizeComparablePhone(sender);

  logToFile(`#join command received - rawSender: ${sender}, normalized: ${normalizedPhone}`);

  if (!normalizedPhone) {
    logToFile(`Unable to normalize sender phone`);
    return "❌ Nombor telefon tidak dapat dikenal pasti daripada mesej WhatsApp.";
  }

  const { member, matchedPhone } = await findMemberByPossiblePhones(supabaseAdmin, [normalizedPhone]);

  logToFile(
    `Member lookup result - found: ${!!member}, matchedPhone: ${matchedPhone || "none"}`
  );

  if (!member) {
    logToFile(`Member not found - returning error message`);
    return "❌ Maaf, akaun anda tidak wujud dalam sistem AMBC.\n\nSila hubungi admin untuk pendaftaran.";
  }

  return continueJoinFlow(member, matchedPhone || normalizedPhone, supabaseAdmin);
}

async function handleCancelCommand(sender: string, supabaseAdmin: AdminSupabaseClient): Promise<string> {
  const normalizedPhone = normalizeComparablePhone(sender);

  logToFile(`#cancel command received - rawSender: ${sender}, normalized: ${normalizedPhone}`);

  if (!normalizedPhone) {
    logToFile(`Unable to normalize sender phone for cancel`);
    return "❌ Nombor telefon tidak dapat dikenal pasti daripada mesej WhatsApp.";
  }

  const { member } = await findMemberByPossiblePhones(supabaseAdmin, [normalizedPhone]);

  if (!member) {
    logToFile(`Member not found for cancel - returning error message`);
    return "❌ Maaf, akaun anda tidak wujud dalam sistem AMBC.\n\nSila hubungi admin untuk pendaftaran.";
  }

  const sessionResult = await supabaseAdmin
    .from("whatsapp_join_sessions")
    .select("id, game_name, game_date, game_time, location, format_details, price")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const session = sessionResult.data as (JoinSessionSummary & { id: string }) | null;

  if (!session) {
    logToFile(`No active session during cancel`);
    return "❌ Tiada join session aktif pada masa ini.";
  }

  const participantResult = await supabaseAdmin
    .from("whatsapp_join_participants")
    .select("id")
    .eq("session_id", session.id)
    .eq("member_id", member.id)
    .maybeSingle();

  if (!participantResult.data) {
    logToFile(`Member ${member.username} is not in active join list`);
    return `⚠️ Nama anda tiada dalam list semasa.\n\n🎳 ${session.game_name}\n📅 ${formatDateMY(session.game_date)}`;
  }

  const { error: deleteError } = await supabaseAdmin
    .from("whatsapp_join_participants")
    .delete()
    .eq("id", participantResult.data.id);

  if (deleteError) {
    logToFile(`Failed to remove participant - error: ${deleteError.message}`);
    console.error("Error removing participant:", deleteError);
    return "❌ Gagal batalkan penyertaan. Sila cuba lagi.";
  }

  const participantsResult = await supabaseAdmin
    .from("whatsapp_join_participants")
    .select("username, is_paid")
    .eq("session_id", session.id)
    .order("joined_at", { ascending: true });

  const participants = (participantsResult.data ?? []) as JoinParticipantSummary[];

  return `✅ Penyertaan anda telah dibatalkan.\n\n${buildJoinSessionReply(session, participants)}`;
}

async function continueJoinFlow(
  member: { id: string; username: string; full_name: string },
  senderPhone: string,
  supabaseAdmin: AdminSupabaseClient
): Promise<string> {
  logToFile(`continueJoinFlow - member: ${member.username} (${member.id})`);
  
  const sessionResult = await supabaseAdmin
    .from("whatsapp_join_sessions")
    .select("id, game_name, game_date, game_time, location, format_details, price")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const session = sessionResult.data as (JoinSessionSummary & { id: string }) | null;

  logToFile(`Active session check - found: ${!!session}, error: ${sessionResult.error?.message || "none"}`);

  if (!session) {
    logToFile(`No active session - returning error`);
    return "❌ Tiada join session aktif pada masa ini.\n\nTunggu admin buka #JOINBLOK.";
  }

  logToFile(`Active session found - game: ${session.game_name}, date: ${session.game_date}`);

  const existingResult = await supabaseAdmin
    .from("whatsapp_join_participants")
    .select("id")
    .eq("session_id", session.id)
    .eq("member_id", member.id)
    .maybeSingle();

  if (existingResult.data) {
    logToFile(`Member already joined - returning duplicate message`);
    return `⚠️ Nama anda telah ada dalam list.\n\n🎳 ${session.game_name}\n📅 ${formatDateMY(session.game_date)}`;
  }

  logToFile(`Adding member to participants...`);

  const { error: insertError } = await supabaseAdmin
    .from("whatsapp_join_participants")
    .insert({
      session_id: session.id,
      member_id: member.id,
      phone_number: senderPhone,
      username: member.username,
      is_paid: false
    });

  if (insertError) {
    logToFile(`Failed to add participant - error: ${insertError.message}`);
    console.error("Error adding participant:", insertError);
    return "❌ Gagal menyertai. Sila cuba lagi.";
  }

  logToFile(`Successfully added participant`);

  const participantsResult = await supabaseAdmin
    .from("whatsapp_join_participants")
    .select("username, is_paid")
    .eq("session_id", session.id)
    .order("joined_at", { ascending: true });

  const participants = (participantsResult.data ?? []) as JoinParticipantSummary[];

  return buildJoinSessionReply(session, participants);
}

async function handleListJoinCommand(supabaseAdmin: AdminSupabaseClient): Promise<string> {
  const sessionResult = await supabaseAdmin
    .from("whatsapp_join_sessions")
    .select("id, game_name, game_date, game_time, location, format_details, price")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const session = sessionResult.data as (JoinSessionSummary & { id: string }) | null;

  if (!session) {
    return "❌ Tiada join session aktif pada masa ini.";
  }

  const participantsResult = await supabaseAdmin
    .from("whatsapp_join_participants")
    .select("username, is_paid")
    .eq("session_id", session.id)
    .order("joined_at", { ascending: true });

  const participants = (participantsResult.data ?? []) as JoinParticipantSummary[];

  return buildJoinSessionReply(session, participants);
}

async function processCommand(message: string, sender: string, supabaseAdmin: AdminSupabaseClient): Promise<string | null> {
  const trimmed = message.trim();
  const lowerMessage = trimmed.toLowerCase();

  if (lowerMessage.includes("#ambc")) {
    return handleAmbcSyncCommand(trimmed, supabaseAdmin);
  }

  if (lowerMessage === "#help") {
    return getHelpMessage();
  }

  if (lowerMessage.includes("#joinblok")) {
    return handleJoinBlokCommand(trimmed, sender, supabaseAdmin);
  }

  if (lowerMessage === "#join") {
    return handleJoinCommand(sender, supabaseAdmin);
  }

  if (lowerMessage === "#cancel") {
    return handleCancelCommand(sender, supabaseAdmin);
  }

  if (lowerMessage === "#listjoin") {
    return handleListJoinCommand(supabaseAdmin);
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
  const target = isGroupTarget ? replyTarget : normalizeComparablePhone(replyTarget);

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
  logToFile(`========== NEW WEBHOOK REQUEST ==========`);
  logToFile(`Method: ${req.method}`);
  
  if (req.method !== "POST") {
    logToFile(`Invalid method - returning 405`);
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceRoleKey || !FONNTE_TOKEN) {
    logToFile(`Missing server configuration`);
    return res.status(500).json({ success: false, message: "Missing server configuration" });
  }

  logToFile(`Full payload: ${JSON.stringify(req.body ?? {})}`);

  const payload = req.body ?? {};
  const { sender, message, participant } = payload as {
    sender?: string;
    message?: string;
    participant?: string;
  };

  logToFile(`Request body - sender: ${sender}, participant: ${participant}, message: ${message}`);
  
  if (!sender || !message) {
    logToFile(`Missing required fields`);
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const normalizedMessage = String(message).trim();
  const normalizedLowerMessage = normalizedMessage.toLowerCase();
  const isGroupMessage = String(sender).includes("@g.us");
  const isEmbeddedAdminCommand =
    normalizedLowerMessage.includes("#joinblok") || normalizedLowerMessage.includes("#ambc");
  
  if (!normalizedMessage.startsWith("#") && !isEmbeddedAdminCommand) {
    logToFile(`Non-command message - ignoring`);
    return res.status(200).json({ success: true, message: "Ignored non-command message" });
  }

  try {
    const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const commandSender = isGroupMessage
      ? await resolveCommandSenderForGroup(supabaseAdmin, payload, participant)
      : normalizeComparablePhone(String(sender));

    logToFile(`Normalized message: ${normalizedMessage}`);
    logToFile(`Message context - isGroup: ${isGroupMessage}, commandSender: ${commandSender || "none"}`);

    logToFile(`Processing command: ${normalizedMessage}`);
    const replyMessage = await processCommand(normalizedMessage, commandSender, supabaseAdmin);
    logToFile(
      replyMessage
        ? `Reply message generated: ${replyMessage.substring(0, 100)}...`
        : `Command completed without reply`
    );

    if (replyMessage) {
      logToFile(`Sending WhatsApp reply to: ${sender}`);
      await sendWhatsAppReply(String(sender), replyMessage, supabaseAdmin);
      logToFile(`Reply sent successfully`);
    }

    logToFile(`Webhook processed successfully`);
    return res.status(200).json({ success: true, message: "Webhook processed successfully" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logToFile(`ERROR: ${errorMessage}`);
    console.error("❌ Webhook processing error:", error);
    return res.status(200).json({ success: false, message: "Webhook processing error" });
  }
}