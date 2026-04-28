import { createClient } from "@supabase/supabase-js";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Database } from "@/integrations/supabase/database.types";

type FonteWebhookData = {
  device?: string;
  sender?: string;
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

function extractSender(webhookData: FonteWebhookData): string {
  return webhookData.sender || webhookData.member?.jid || webhookData.data?.from || "";
}

function extractMessageText(webhookData: FonteWebhookData): string {
  return webhookData.message || webhookData.data?.body || "";
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

async function sendWhatsAppReply(sender: string, message: string): Promise<void> {
  const target = normalizeComparablePhone(sender);

  if (!target) {
    console.warn("⚠️ WhatsApp auto-reply skipped because sender could not be normalized");
    return;
  }

  if (!FONNTE_TOKEN) {
    console.warn("⚠️ WhatsApp auto-reply skipped because FONNTE_API_TOKEN is missing");
    return;
  }

  try {
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

    if (!response.ok) {
      console.error("❌ Failed to send WhatsApp auto-reply:", response.status, responseText);
      return;
    }

    console.log("✅ WhatsApp auto-reply sent:", target);
  } catch (error) {
    console.error("❌ WhatsApp auto-reply error:", error);
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
  parsedCommand: ParsedBlokCommand
): Promise<{ success: boolean; message: string }> {
  if (parsedCommand.status === "invalid_date") {
    const replyMessage = buildReplyMessage(
      `Tarikh *${parsedCommand.rawDate}* tidak sah. Sila guna format *#blokambc dd.mm.yyyy* dengan tarikh yang betul.`
    );

    await sendWhatsAppReply(sender, replyMessage);

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

    await sendWhatsAppReply(sender, replyMessage);
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

    await sendWhatsAppReply(sender, replyMessage);
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

    await sendWhatsAppReply(sender, replyMessage);
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

      await sendWhatsAppReply(sender, replyMessage);

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

  await sendWhatsAppReply(sender, successReply);

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
  parsedCommand: ParsedBlokCommand
): Promise<{ success: boolean; message: string }> {
  if (parsedCommand.status === "invalid_date") {
    const replyMessage = buildReplyMessage(
      `Tarikh *${parsedCommand.rawDate}* tidak sah. Sila guna format *#blok dd.mm.yyyy* dengan tarikh yang betul.`
    );

    await sendWhatsAppReply(sender, replyMessage);

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

    await sendWhatsAppReply(sender, replyMessage);
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

  await sendWhatsAppReply(sender, leaderboardMessage);

  console.log(
    `✅ Sent BLOK leaderboard for ${targetGame.game_name} on ${parsedCommand.isoDate} to ${sender}`
  );

  return {
    success: true,
    message: `Leaderboard for BLOK ${parsedCommand.rawDate} sent successfully`,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WebhookResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed - Only POST requests accepted",
    });
  }

  let sender = "";
  let shouldReply = false;

  try {
    const webhookData = req.body as FonteWebhookData;
    sender = extractSender(webhookData);
    const messageText = extractMessageText(webhookData);
    const status = webhookData.status;
    
    const parsedRegistration = parseBlokRegistration(messageText);
    const parsedLeaderboard = parseBlokLeaderboard(messageText);
    shouldReply = parsedRegistration !== null || parsedLeaderboard !== null;

    // DETAILED LOGGING - Log semua webhook incoming untuk debugging
    const logEntry = {
      timestamp: new Date().toISOString(),
      sender: sender || "unknown",
      message: messageText || "empty",
      status: status || "no-status",
      device: webhookData.device || "unknown",
      fullPayload: JSON.stringify(webhookData, null, 2),
      isBlokCommand: parsedRegistration !== null || parsedLeaderboard !== null,
    };

    console.log("\n=== FONNTE WEBHOOK RECEIVED ===");
    console.log("Timestamp:", logEntry.timestamp);
    console.log("📱 Sender:", logEntry.sender);
    console.log("💬 Message:", logEntry.message);
    console.log("📊 Status:", logEntry.status);
    console.log("📱 Device:", logEntry.device);
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
        const logLine = `${logEntry.timestamp} | ${logEntry.sender} | ${logEntry.message} | Blok:${logEntry.isBlokCommand}\n`;
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
        sender,
        buildReplyMessage("Sistem tidak dapat diproses sekarang. Sila cuba sebentar lagi.")
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
      result = await handleBlokRegistration(supabaseAdmin, sender, parsedRegistration);
    } else {
      result = await handleBlokLeaderboardQuery(supabaseAdmin, sender, parsedLeaderboard!);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("\n=== WEBHOOK PROCESSING ERROR ===");
    console.error("Error:", error);

    if (shouldReply && sender) {
      await sendWhatsAppReply(
        sender,
        buildReplyMessage("Sistem tidak dapat diproses sekarang. Sila cuba semula sebentar lagi.")
      );
    }

    return res.status(200).json({
      success: false,
      message: "Webhook processing error",
    });
  }
}