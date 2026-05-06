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

type WhatsAppCommand = {
  id: string;
  command_key: string;
  command_trigger: string;
  response_message: string;
  is_active: boolean;
  is_hidden: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
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

type ResolvedCommandSender = {
  phone: string;
  member: JoinLookupMember | null;
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
  payment_note?: string | null;
};

type ParsedAmbcParticipant = {
  name: string;
  is_paid: boolean;
  payment_note: string;
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
const MAX_CONFIRMED_PARTICIPANTS = 48;

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

  // Support both Malaysia (60) and Singapore (65) country codes
  if (digitsOnly.startsWith("60")) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.startsWith("65")) {
    return `+${digitsOnly}`;
  }

  // Malaysia local format (0xx) -> +60xx
  if (digitsOnly.startsWith("0")) {
    return `+60${digitsOnly.slice(1)}`;
  }

  // Default to Malaysia for unrecognized formats (backward compatibility)
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
    trimmed.startsWith("65") ||
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

  // Try exact matches in parallel first
  const exactResults = await Promise.all(
    normalizedCandidates.map((phone) =>
      supabaseAdmin
        .from("members")
        .select("id, username, full_name, phone")
        .eq("phone", phone)
        .maybeSingle()
    )
  );

  for (let i = 0; i < exactResults.length; i++) {
    if (exactResults[i].data) {
      return {
        member: exactResults[i].data as JoinLookupMember,
        matchedPhone: normalizedCandidates[i],
      };
    }
  }

  // Fallback to fuzzy matching if no exact match
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
): Promise<ResolvedCommandSender> {
  const directParticipant = normalizeComparablePhone(String(participant ?? ""));

  if (directParticipant) {
    const directMatch = await findMemberByPossiblePhones(supabaseAdmin, [directParticipant]);

    if (directMatch.member) {
      return {
        phone: directMatch.matchedPhone || directParticipant,
        member: directMatch.member,
      };
    }
  }

  const fallbackCandidates = extractFallbackPhoneCandidates(payload);
  const fallbackMatch = await findMemberByPossiblePhones(supabaseAdmin, fallbackCandidates);

  return {
    phone: fallbackMatch.matchedPhone || directParticipant || fallbackCandidates[0] || "",
    member: fallbackMatch.member,
  };
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

async function buildDynamicHelpMessage(supabaseAdmin: AdminSupabaseClient): Promise<string> {
  const { data: customCommands } = await supabaseAdmin
    .from("whatsapp_commands")
    .select("command_trigger, description")
    .eq("is_active", true)
    .eq("is_hidden", false)
    .order("created_at", { ascending: true });

  let helpText = `📋 *AMBC CLUB - WhatsApp Commands*\n\n` +
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
    `   Papar senarai peserta yang telah join\n\n`;

  if (customCommands && customCommands.length > 0) {
    for (const cmd of customCommands) {
      const description = cmd.description || "Custom command";
      helpText += `⭐ *${cmd.command_trigger}*\n   ${description}\n\n`;
    }
  }

  helpText += `❓ *#help*\n   Papar senarai command ini\n\n_Powered by AMBC Club_`;

  return helpText;
}

async function getDynamicCommand(
  trigger: string,
  supabaseAdmin: AdminSupabaseClient
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("whatsapp_commands")
    .select("response_message")
    .eq("command_trigger", trigger.toLowerCase())
    .eq("is_active", true)
    .maybeSingle();

  return data ? data.response_message : null;
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

    if (/^senarai peserta[:]?$/i.test(cleaned) || /^✍️/i.test(line)) {
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

      const fullText = participantMatch[1].trim();
      
      // Extract payment note (badge + text after username)
      // Pattern: "Username ✅ 76" or "Username ©️ 66" or just "Username"
      const noteMatch = fullText.match(/^([^✅©️]+?)\s*([✅©️].*)$/u);
      
      let participantName = "";
      let paymentNote = "";
      let hasPaidMarker = false;

      if (noteMatch) {
        participantName = noteMatch[1].trim();
        paymentNote = noteMatch[2].trim();
        hasPaidMarker = paymentNote.includes("✅");
      } else {
        // No badge - check if there's a standalone ✅ at the end
        const checkmarkMatch = fullText.match(/^(.+?)\s*✅\s*$/u);
        if (checkmarkMatch) {
          participantName = checkmarkMatch[1].trim();
          hasPaidMarker = true;
        } else {
          participantName = fullText.trim();
        }
      }

      if (participantName) {
        participants.push({
          name: participantName,
          is_paid: hasPaidMarker,
          payment_note: paymentNote,
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
      const username = participant.username || "-";
      const paymentNote = participant.payment_note ? ` ${participant.payment_note}` : "";
      return `${index + 1}. ${username}${paymentNote}`;
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
  const confirmedParticipants = participants.slice(0, MAX_CONFIRMED_PARTICIPANTS);
  const waitingParticipants = participants.slice(MAX_CONFIRMED_PARTICIPANTS);
  const participantList = formatJoinParticipantSection(confirmedParticipants);
  const waitingList = formatJoinParticipantSection(waitingParticipants);

  return `🎳🔥*#${session.game_name}*🔥🎳\n\n` +
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
    `Waiting List\n` +
    `${waitingList}\n\n` +
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

  // Deduplicate participants - keep first occurrence only (case-insensitive)
  const seenNames = new Set<string>();
  const uniqueParticipants = parsedSession.participants.filter((participant) => {
    const normalizedName = normalizeMemberNameKey(participant.name);
    if (seenNames.has(normalizedName)) {
      return false;
    }
    seenNames.add(normalizedName);
    return true;
  });

  // Batch resolve all participant names in parallel
  const memberLookups = await Promise.all(
    uniqueParticipants.map(async (participant) => {
      const normalizedName = normalizeMemberNameKey(participant.name);
      const existingParticipant = existingByName.get(normalizedName);

      if (existingParticipant) {
        return { participant, existingParticipant, member: null };
      }

      const member = await resolveParticipantMemberByName(supabaseAdmin, participant.name);
      return { participant, existingParticipant: null, member };
    })
  );

  const resolvedParticipants: Array<{
    session_id: string;
    member_id: string | null;
    phone_number: string;
    username: string;
    is_paid: boolean;
    payment_note: string;
    joined_at: string;
  }> = [];

  const baseTime = Date.now();

  memberLookups.forEach(({ participant, existingParticipant, member }, index) => {
    if (existingParticipant) {
      resolvedParticipants.push({
        session_id: activeSession.id,
        member_id: existingParticipant.member_id,
        phone_number: existingParticipant.phone_number,
        username: existingParticipant.username,
        is_paid: participant.is_paid,
        payment_note: participant.payment_note,
        joined_at: new Date(baseTime + index * 1000).toISOString(),
      });
      return;
    }

    if (!member) {
      resolvedParticipants.push({
        session_id: activeSession.id,
        member_id: null,
        phone_number: "",
        username: participant.name,
        is_paid: participant.is_paid,
        payment_note: participant.payment_note,
        joined_at: new Date(baseTime + index * 1000).toISOString(),
      });
      return;
    }

    resolvedParticipants.push({
      session_id: activeSession.id,
      member_id: member.id,
      phone_number: member.phone,
      username: member.username || participant.name,
      is_paid: participant.is_paid,
      payment_note: participant.payment_note,
      joined_at: new Date(baseTime + index * 1000).toISOString(),
    });
  });

  const { error: deleteError } = await supabaseAdmin
    .from("whatsapp_join_participants")
    .delete()
    .eq("session_id", activeSession.id);

  if (deleteError) {
    return null;
  }

  if (resolvedParticipants.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from("whatsapp_join_participants")
      .insert(resolvedParticipants);

    if (insertError) {
      return null;
    }
  }

  return null;
}

async function handleCreateBlokCommand(
  supabaseAdmin: AdminSupabaseClient
): Promise<string> {
  console.log("[#createblok] Command triggered");

  // Get active join session
  const sessionResult = await supabaseAdmin
    .from("whatsapp_join_sessions")
    .select("id, game_name, game_date, game_time, location, format_details, price")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log("[#createblok] Session result:", { data: sessionResult.data, error: sessionResult.error });

  const session = sessionResult.data as (JoinSessionSummary & { id: string }) | null;

  if (!session) {
    console.log("[#createblok] No active session found");
    return "❌ Tiada join session aktif untuk dijadikan game.";
  }

  console.log("[#createblok] Active session found:", session.id, session.game_date);

  // Check if game already exists for this date
  const existingGameResult = await supabaseAdmin
    .from("games")
    .select("id, game_name")
    .eq("game_date", session.game_date)
    .maybeSingle();

  console.log("[#createblok] Existing game check:", { data: existingGameResult.data, error: existingGameResult.error });

  if (existingGameResult.data) {
    console.log("[#createblok] Game already exists for this date");
    return `⚠️ Game untuk tarikh ${formatDateMY(session.game_date)} sudah wujud:\n\n${existingGameResult.data.game_name}`;
  }

  // Get first 48 participants ordered by joined_at
  const participantsResult = await supabaseAdmin
    .from("whatsapp_join_participants")
    .select("member_id, username, phone_number")
    .eq("session_id", session.id)
    .not("member_id", "is", null)
    .order("joined_at", { ascending: true })
    .limit(48);

  const participants = participantsResult.data ?? [];
  console.log("[#createblok] Participants found:", participants.length, "Error:", participantsResult.error);

  if (participants.length === 0) {
    console.log("[#createblok] No valid participants");
    return "❌ Tiada peserta dengan member ID yang sah untuk dijadikan game.";
  }

  // Extract year from game_date
  const gameYear = parseInt(session.game_date.split("-")[0] || new Date().getFullYear().toString());
  console.log("[#createblok] Game year:", gameYear);

  // Create new game
  const gameInsertResult = await supabaseAdmin
    .from("games")
    .insert({
      game_name: session.game_name || "BLOK",
      game_date: session.game_date,
      location: session.location || "AMBC",
      game_type: "BLOK",
      year: gameYear,
      is_official: true
    })
    .select("id")
    .single();

  console.log("[#createblok] Game insert result:", { data: gameInsertResult.data, error: gameInsertResult.error });

  if (gameInsertResult.error || !gameInsertResult.data) {
    console.error("[#createblok] Error creating game:", gameInsertResult.error);
    return "❌ Gagal mencipta game. Sila cuba lagi.";
  }

  const gameId = gameInsertResult.data.id;
  console.log("[#createblok] Game created with ID:", gameId);

  // Add participants to game_players
  const gamePlayers = participants.map((p) => ({
    game_id: gameId,
    member_id: p.member_id as string,
    game1_score: 0,
    game2_score: 0,
    game3_score: 0,
    game4_score: 0,
    game5_score: 0,
    handicap: 0
  }));

  console.log("[#createblok] Inserting", gamePlayers.length, "players");

  const participantsInsertResult = await supabaseAdmin
    .from("game_players")
    .insert(gamePlayers);

  console.log("[#createblok] Players insert result:", { error: participantsInsertResult.error });

  if (participantsInsertResult.error) {
    console.error("[#createblok] Error adding participants:", participantsInsertResult.error);
    // Rollback game creation
    await supabaseAdmin.from("games").delete().eq("id", gameId);
    console.log("[#createblok] Game rolled back");
    return "❌ Gagal menambah peserta ke game. Sila cuba lagi.";
  }

  // Mark session as closed
  const closeResult = await supabaseAdmin
    .from("whatsapp_join_sessions")
    .update({ status: "closed" })
    .eq("id", session.id);

  console.log("[#createblok] Session close result:", { error: closeResult.error });

  console.log("[#createblok] Success! Game created with", participants.length, "players");

  return `✅ *GAME BERJAYA DICIPTA!*

🎳 ${session.game_name}
📅 ${formatDateMY(session.game_date)}
⏰ ${session.game_time || "20:00"}
📍 ${session.location || "AMBC"}

👥 Total peserta: *${participants.length}*

Game telah dicipta dan join session ditutup.`;
}

async function handleJoinCommand(
  senderContext: ResolvedCommandSender,
  supabaseAdmin: AdminSupabaseClient
): Promise<string> {
  const normalizedPhone = normalizeComparablePhone(senderContext.phone);

  if (!normalizedPhone) {
    return "❌ Nombor telefon tidak dapat dikenal pasti daripada mesej WhatsApp.";
  }

  let member = senderContext.member;
  let matchedPhone = normalizedPhone;

  if (!member) {
    const lookupResult = await findMemberByPossiblePhones(supabaseAdmin, [normalizedPhone]);
    member = lookupResult.member;
    matchedPhone = lookupResult.matchedPhone || normalizedPhone;
  }

  if (!member) {
    return "❌ Maaf, akaun anda tidak wujud dalam sistem AMBC.\n\nSila hubungi admin untuk pendaftaran.";
  }

  return continueJoinFlow(member, matchedPhone, supabaseAdmin);
}

async function handleCancelCommand(
  senderContext: ResolvedCommandSender,
  supabaseAdmin: AdminSupabaseClient
): Promise<string> {
  const normalizedPhone = normalizeComparablePhone(senderContext.phone);

  if (!normalizedPhone) {
    return "❌ Nombor telefon tidak dapat dikenal pasti daripada mesej WhatsApp.";
  }

  let member = senderContext.member;

  if (!member) {
    const lookupResult = await findMemberByPossiblePhones(supabaseAdmin, [normalizedPhone]);
    member = lookupResult.member;
  }

  if (!member) {
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
    return "❌ Tiada join session aktif pada masa ini.";
  }

  const participantResult = await supabaseAdmin
    .from("whatsapp_join_participants")
    .select("id")
    .eq("session_id", session.id)
    .eq("member_id", member.id)
    .maybeSingle();

  if (!participantResult.data) {
    return `⚠️ Nama anda tiada dalam list semasa.\n\n🎳 ${session.game_name}\n📅 ${formatDateMY(session.game_date)}`;
  }

  const { error: deleteError } = await supabaseAdmin
    .from("whatsapp_join_participants")
    .delete()
    .eq("id", participantResult.data.id);

  if (deleteError) {
    console.error("Error removing participant:", deleteError);
    return "❌ Gagal batalkan penyertaan. Sila cuba lagi.";
  }

  const participantsResult = await supabaseAdmin
    .from("whatsapp_join_participants")
    .select("username, is_paid, payment_note")
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
  const sessionResult = await supabaseAdmin
    .from("whatsapp_join_sessions")
    .select("id, game_name, game_date, game_time, location, format_details, price")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const session = sessionResult.data as (JoinSessionSummary & { id: string }) | null;

  if (!session) {
    return "❌ Tiada join session aktif pada masa ini.\n\nTunggu admin buka #JOINBLOK.";
  }

  const existingResult = await supabaseAdmin
    .from("whatsapp_join_participants")
    .select("id")
    .eq("session_id", session.id)
    .eq("member_id", member.id)
    .maybeSingle();

  if (existingResult.data) {
    return `⚠️ Nama anda telah ada dalam list.\n\n🎳 ${session.game_name}\n📅 ${formatDateMY(session.game_date)}`;
  }

  const { error: insertError } = await supabaseAdmin
    .from("whatsapp_join_participants")
    .insert({
      session_id: session.id,
      member_id: member.id,
      phone_number: senderPhone,
      username: member.username,
      is_paid: false,
      payment_note: ""
    });

  if (insertError) {
    console.error("Error adding participant:", insertError);
    return "❌ Gagal menyertai. Sila cuba lagi.";
  }

  const participantsResult = await supabaseAdmin
    .from("whatsapp_join_participants")
    .select("username, is_paid, payment_note")
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
    .select("username, is_paid, payment_note")
    .eq("session_id", session.id)
    .order("joined_at", { ascending: true });

  const participants = (participantsResult.data ?? []) as JoinParticipantSummary[];

  return buildJoinSessionReply(session, participants);
}

async function processCommand(
  message: string,
  senderContext: ResolvedCommandSender,
  supabaseAdmin: AdminSupabaseClient
): Promise<string | null> {
  const normalizedLower = message.toLowerCase().trim();

  if (normalizedLower === "#help") {
    return `🎳 *AMBC CLUB - WhatsApp Commands*

*Join Commands:*
• #join - Sertai game session
• #cancel - Batalkan penyertaan
• #listjoin - Papar senarai peserta

*Info Commands:*
• #help - Papar mesej ini

Terima kasih! 🎳`;
  }

  if (normalizedLower === "#theboy") {
    return "ambc the boy always wins!!!";
  }

  if (normalizedLower === "#join") {
    return handleJoinCommand(senderContext, supabaseAdmin);
  }

  if (normalizedLower === "#cancel") {
    return handleCancelCommand(senderContext, supabaseAdmin);
  }

  if (normalizedLower === "#listjoin") {
    return handleListJoinCommand(supabaseAdmin);
  }

  if (normalizedLower === "#createblok") {
    return handleCreateBlokCommand(supabaseAdmin);
  }

  if (message.toLowerCase().includes("#joinblok")) {
    return handleJoinBlokCommand(message, senderContext.phone, supabaseAdmin);
  }

  if (message.toLowerCase().includes("#ambc")) {
    await handleAmbcSyncCommand(message, supabaseAdmin);
    return null;
  }

  return null;
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
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceRoleKey || !FONNTE_TOKEN) {
    return res.status(500).json({ success: false, message: "Missing server configuration" });
  }

  const payload = req.body ?? {};
  const { sender, message, participant } = payload as {
    sender?: string;
    message?: string;
    participant?: string;
  };

  if (!sender || !message) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const normalizedMessage = String(message).trim();
  const normalizedLowerMessage = normalizedMessage.toLowerCase();
  const isGroupMessage = String(sender).includes("@g.us");
  const isEmbeddedAdminCommand =
    normalizedLowerMessage.includes("#joinblok") || normalizedLowerMessage.includes("#ambc");
  
  if (!normalizedMessage.startsWith("#") && !isEmbeddedAdminCommand) {
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
      : { phone: normalizeComparablePhone(String(sender)), member: null };

    const replyMessage = await processCommand(normalizedMessage, commandSender, supabaseAdmin);

    // Send WhatsApp reply immediately if there's a message
    if (replyMessage) {
      await sendWhatsAppReply(String(sender), replyMessage, supabaseAdmin);
    }

    // Return success immediately - don't wait for background processing
    return res.status(200).json({ success: true, message: "Webhook processed successfully" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Webhook processing error:", error);
    return res.status(200).json({ success: false, message: "Webhook processing error" });
  }
}