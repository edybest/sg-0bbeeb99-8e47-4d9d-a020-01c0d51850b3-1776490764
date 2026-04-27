import { createClient } from "@supabase/supabase-js";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Database } from "@/integrations/supabase/types";
import {
  parseAmbcBlokImport,
  parseBlokCommand,
  parseJoinBlokCommand,
  parseStatusCommand,
  type ParsedAmbcBlokImport,
  type ParsedBlokCommand,
} from "@/lib/whatsappBlok";
import {
  appendMemberToBlokJoinQueue,
  buildQueuePlacement,
  findBlokJoinQueueEntry,
  getActiveBlokJoinGameId,
  getBlokJoinQueueEntries,
  hasMemberInBlokJoinQueue,
  seedBlokJoinQueue,
  setActiveBlokJoinGame,
  type BlokJoinQueueEntryInput,
} from "@/services/blokJoinQueueService";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

type FonteWebhookData = {
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
};

type WebhookResponse = {
  success: boolean;
  message: string;
};

type SenderContext = {
  replyTarget: string;
  memberSender: string;
  groupId: string | null;
};

type MemberLookup = Pick<
  Database["public"]["Tables"]["members"]["Row"],
  "id" | "username" | "full_name" | "phone" | "handicap" | "is_verified"
>;

type GameLookup = Pick<
  Database["public"]["Tables"]["games"]["Row"],
  "id" | "game_name" | "game_date" | "game_type" | "is_official" | "created_at" | "location"
>;

type SupabaseAdminClient = ReturnType<typeof createClient<Database>>;

const FONNTE_API_URL = "https://api.fonnte.com/send";
const FONNTE_TOKEN = process.env.FONNTE_API_TOKEN || "";
const PRODUCTION_WEBHOOK_LOG_PATH = join(process.cwd(), "logs", "webhook-production.log");

export function extractSenderContext(webhookData: FonteWebhookData): SenderContext {
  const rawSender = webhookData.sender || "";
  const rawMemberJid = webhookData.member?.jid || "";
  const rawFrom = webhookData.data?.from || "";
  const replyTarget = rawSender || rawFrom || rawMemberJid || "";
  const memberSender = rawMemberJid || rawSender || rawFrom || "";
  const groupId =
    rawMemberJid && rawSender && rawSender !== rawMemberJid
      ? rawSender
      : rawMemberJid && rawFrom && rawFrom !== rawMemberJid
        ? rawFrom
        : null;

  return {
    replyTarget,
    memberSender,
    groupId,
  };
}

export function extractMessageText(webhookData: FonteWebhookData): string {
  return webhookData.message || webhookData.data?.body || "";
}

async function logProductionWebhookTrigger(details: Record<string, unknown>): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const payload = {
    triggeredAt: new Date().toISOString(),
    route: "/api/whatsapp-webhook",
    ...details,
  };
  const line = `${JSON.stringify(payload)}\n`;

  console.warn("=== PRODUCTION WEBHOOK TRIGGERED ===", payload);

  try {
    await mkdir(join(process.cwd(), "logs"), { recursive: true });
    await appendFile(PRODUCTION_WEBHOOK_LOG_PATH, line, "utf8");
  } catch (error) {
    console.error("=== PRODUCTION WEBHOOK LOG WRITE FAILED ===", error);
  }
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

function normalizeComparableName(value: string): string {
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

function buildNameVariants(value: string): string[] {
  const base = normalizeComparableName(value);

  if (!base) {
    return [];
  }

  const variants = new Set<string>([base, base.replace(/\s+/g, "")]);
  const tokens = base.split(" ").filter(Boolean);
  const lastToken = tokens[tokens.length - 1];

  if (tokens.length > 1 && /[0-9/]/.test(lastToken || "")) {
    const trimmed = tokens.slice(0, -1).join(" ");

    if (trimmed) {
      variants.add(trimmed);
      variants.add(trimmed.replace(/\s+/g, ""));
    }
  }

  return Array.from(variants);
}

function buildReplyMessage(message: string): string {
  return `🎳 *AMBC CLUB - Pendaftaran BLOK*\n\n${message}`;
}

function summarizeNames(names: string[]): string {
  if (names.length === 0) {
    return "-";
  }

  if (names.length <= 8) {
    return names.join(", ");
  }

  return `${names.slice(0, 8).join(", ")} dan ${names.length - 8} lagi`;
}

function normalizeReplyTarget(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.includes("@g.us")) {
    return trimmedValue;
  }

  return normalizeComparablePhone(trimmedValue);
}

async function sendWhatsAppReply(sender: string, message: string): Promise<void> {
  const target = normalizeReplyTarget(sender);

  if (!target || !FONNTE_TOKEN) {
    console.log("=== WHATSAPP REPLY SKIPPED ===", {
      sender,
      target,
      hasToken: Boolean(FONNTE_TOKEN),
    });
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

  console.log("=== WHATSAPP REPLY RESULT ===", {
    sender,
    target,
    ok: response.ok,
    status: response.status,
    responseText,
  });
}

function getSupabaseAdminClient(): SupabaseAdminClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function findMatchingMemberByPhone(
  supabaseAdmin: SupabaseAdminClient,
  sender: string
): Promise<MemberLookup | null> {
  const normalizedSender = normalizeComparablePhone(sender);

  if (!normalizedSender) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("members")
    .select("id, username, full_name, phone, handicap, is_verified")
    .eq("is_verified", true);

  if (error) {
    throw error;
  }

  return (
    (data || []).find((member) => normalizeComparablePhone(member.phone) === normalizedSender) || null
  );
}

async function getVerifiedMembers(supabaseAdmin: SupabaseAdminClient): Promise<MemberLookup[]> {
  const { data, error } = await supabaseAdmin
    .from("members")
    .select("id, username, full_name, phone, handicap, is_verified")
    .eq("is_verified", true);

  if (error) {
    throw error;
  }

  return data || [];
}

function findMatchingMemberByName(members: MemberLookup[], playerName: string): MemberLookup | null {
  const variants = buildNameVariants(playerName);

  if (variants.length === 0) {
    return null;
  }

  const exactMatches = members.filter((member) => {
    const username = normalizeComparableName(member.username);
    const fullName = normalizeComparableName(member.full_name);

    return variants.some(
      (variant) =>
        variant === username ||
        variant === fullName ||
        variant === username.replace(/\s+/g, "") ||
        variant === fullName.replace(/\s+/g, "")
    );
  });

  if (exactMatches.length === 1) {
    return exactMatches[0];
  }

  const looseMatches = members.filter((member) => {
    const username = normalizeComparableName(member.username);
    const fullName = normalizeComparableName(member.full_name);

    return variants.some(
      (variant) =>
        variant.length >= 3 &&
        (username.startsWith(variant) ||
          fullName.startsWith(variant) ||
          variant.startsWith(username) ||
          variant.startsWith(fullName))
    );
  });

  return looseMatches.length === 1 ? looseMatches[0] : null;
}

async function findExactTargetBlokGame(
  supabaseAdmin: SupabaseAdminClient,
  isoDate: string
): Promise<{ game: GameLookup | null; reason?: string }> {
  const { data, error } = await supabaseAdmin
    .from("games")
    .select("id, game_name, game_date, game_type, is_official, created_at, location")
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

async function findOrCreateBlokGame(
  supabaseAdmin: SupabaseAdminClient,
  parsedBulkImport: Extract<ParsedAmbcBlokImport, { status: "valid" | "no_players" }>
): Promise<{ game: GameLookup | null; created: boolean; reason?: string }> {
  const existingGameResult = await findExactTargetBlokGame(supabaseAdmin, parsedBulkImport.isoDate);

  if (existingGameResult.game) {
    return {
      game: existingGameResult.game,
      created: false,
    };
  }

  if (existingGameResult.reason?.includes("lebih daripada satu")) {
    return {
      game: null,
      created: false,
      reason: existingGameResult.reason,
    };
  }

  const { data, error } = await supabaseAdmin
    .from("games")
    .insert({
      game_name: parsedBulkImport.title || `BLOK ${parsedBulkImport.rawDate}`,
      game_date: parsedBulkImport.isoDate,
      game_type: "BLOK",
      year: Number(parsedBulkImport.isoDate.slice(0, 4)),
      is_official: true,
      location: parsedBulkImport.location,
    })
    .select("id, game_name, game_date, game_type, is_official, created_at, location")
    .single();

  if (error) {
    throw error;
  }

  return {
    game: data,
    created: true,
  };
}

function formatIsoDateToDisplay(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return day && month && year ? `${day}.${month}.${year}` : isoDate;
}

function getMalaysiaTodayIsoDate(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value || "0000";
  const month = parts.find((part) => part.type === "month")?.value || "00";
  const day = parts.find((part) => part.type === "day")?.value || "00";

  return `${year}-${month}-${day}`;
}

function isPastBlokDate(isoDate: string): boolean {
  return isoDate < getMalaysiaTodayIsoDate();
}

function buildQueueSeedEntries(
  parsedBulkImport: Extract<ParsedAmbcBlokImport, { status: "valid" }>,
  members: MemberLookup[]
): BlokJoinQueueEntryInput[] {
  const takenMemberIds = new Set<string>();

  return [...parsedBulkImport.playerNames, ...parsedBulkImport.waitingListNames]
    .map((displayName) => {
      const matchedMember = findMatchingMemberByName(members, displayName);

      if (!matchedMember || takenMemberIds.has(matchedMember.id)) {
        return {
          displayName,
          memberId: null,
        };
      }

      takenMemberIds.add(matchedMember.id);

      return {
        displayName,
        memberId: matchedMember.id,
      };
    })
    .filter((entry) => entry.displayName);
}

async function findActiveBlokJoinGame(
  supabaseAdmin: SupabaseAdminClient
): Promise<{ game: GameLookup | null; reason?: string }> {
  const activeGameId = await getActiveBlokJoinGameId(supabaseAdmin);

  if (!activeGameId) {
    return {
      game: null,
      reason: "Tiada senarai BLOK aktif untuk join sekarang. Sila tunggu post admin terkini.",
    };
  }

  const { data, error } = await supabaseAdmin
    .from("games")
    .select("id, game_name, game_date, game_type, is_official, created_at, location")
    .eq("id", activeGameId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return {
      game: null,
      reason: "Senarai BLOK aktif tidak ditemui. Sila tunggu post admin terkini.",
    };
  }

  return {
    game: data,
  };
}

async function handleSingleBlokRegistration(
  supabaseAdmin: SupabaseAdminClient,
  memberSender: string,
  replyTarget: string,
  parsedCommand: Extract<ParsedBlokCommand, { status: "valid" }>
): Promise<WebhookResponse> {
  const member = await findMatchingMemberByPhone(supabaseAdmin, memberSender);

  if (!member) {
    await sendWhatsAppReply(
      replyTarget,
      buildReplyMessage("Nombor WhatsApp anda tidak sepadan dengan mana-mana ahli berdaftar.")
    );

    return {
      success: false,
      message: "Nombor WhatsApp tidak sepadan dengan mana-mana ahli berdaftar",
    };
  }

  const targetGameResult = await findExactTargetBlokGame(supabaseAdmin, parsedCommand.isoDate);

  if (!targetGameResult.game) {
    await sendWhatsAppReply(
      replyTarget,
      buildReplyMessage(targetGameResult.reason || `Game BLOK untuk ${parsedCommand.rawDate} tidak ditemui.`)
    );

    return {
      success: false,
      message: targetGameResult.reason || "Game BLOK tidak ditemui",
    };
  }

  const { data: existingPlayer, error: existingPlayerError } = await supabaseAdmin
    .from("game_players")
    .select("id")
    .eq("game_id", targetGameResult.game.id)
    .eq("member_id", member.id)
    .maybeSingle();

  if (existingPlayerError) {
    throw existingPlayerError;
  }

  if (existingPlayer) {
    await sendWhatsAppReply(
      replyTarget,
      buildReplyMessage(
        `${member.full_name}, anda sudah berada dalam senarai pemain BLOK untuk *${parsedCommand.rawDate}*.`
      )
    );

    return {
      success: true,
      message: `${member.full_name} sudah berada dalam senarai pemain BLOK ${parsedCommand.rawDate}`,
    };
  }

  const { error: insertError } = await supabaseAdmin.from("game_players").insert({
    game_id: targetGameResult.game.id,
    member_id: member.id,
    handicap: member.handicap || 0,
  });

  if (insertError) {
    throw insertError;
  }

  await sendWhatsAppReply(
    replyTarget,
    buildReplyMessage(
      `${member.full_name}, anda berjaya dimasukkan ke senarai pemain *${targetGameResult.game.game_name}* pada *${parsedCommand.rawDate}*.`
    )
  );

  return {
    success: true,
    message: `${member.full_name} berjaya dimasukkan ke senarai pemain BLOK ${parsedCommand.rawDate}`,
  };
}

async function handleBulkAmbcBlokImport(
  supabaseAdmin: SupabaseAdminClient,
  replyTarget: string,
  parsedBulkImport: Extract<ParsedAmbcBlokImport, { status: "valid" }>
): Promise<WebhookResponse> {
  const gameResult = await findOrCreateBlokGame(supabaseAdmin, parsedBulkImport);

  if (!gameResult.game) {
    await sendWhatsAppReply(
      replyTarget,
      buildReplyMessage(gameResult.reason || "Game BLOK tidak dapat diproses.")
    );

    return {
      success: false,
      message: gameResult.reason || "Game BLOK tidak dapat diproses",
    };
  }

  const members = await getVerifiedMembers(supabaseAdmin);
  const { data: existingPlayers, error: existingPlayersError } = await supabaseAdmin
    .from("game_players")
    .select("member_id")
    .eq("game_id", gameResult.game.id);

  if (existingPlayersError) {
    throw existingPlayersError;
  }

  const existingMemberIds = new Set((existingPlayers || []).map((item) => item.member_id));
  const queuedMemberIds = new Set<string>();
  const duplicateNames: string[] = [];
  const unmatchedNames: string[] = [];
  const inserts: Array<{ game_id: string; member_id: string; handicap: number }> = [];

  for (const playerName of parsedBulkImport.playerNames) {
    const matchedMember = findMatchingMemberByName(members, playerName);

    if (!matchedMember) {
      unmatchedNames.push(playerName);
      continue;
    }

    if (existingMemberIds.has(matchedMember.id) || queuedMemberIds.has(matchedMember.id)) {
      duplicateNames.push(playerName);
      continue;
    }

    queuedMemberIds.add(matchedMember.id);
    inserts.push({
      game_id: gameResult.game.id,
      member_id: matchedMember.id,
      handicap: matchedMember.handicap || 0,
    });
  }

  if (inserts.length > 0) {
    const { error: insertError } = await supabaseAdmin.from("game_players").insert(inserts);

    if (insertError) {
      throw insertError;
    }
  }

  const queueEntries = buildQueueSeedEntries(parsedBulkImport, members);
  await seedBlokJoinQueue(supabaseAdmin, gameResult.game.id, queueEntries);
  await setActiveBlokJoinGame(supabaseAdmin, gameResult.game.id);

  const replyLines = [
    `Import senarai BLOK untuk *${parsedBulkImport.rawDate}* selesai.`,
    "",
    `Game: *${gameResult.game.game_name}*${gameResult.created ? " (dicipta baharu)" : ""}`,
    `Berjaya import: *${inserts.length}*`,
    `Duplicate diabaikan: *${duplicateNames.length}*`,
    `Tidak dipadankan: *${unmatchedNames.length}*`,
    `Queue join aktif: *${queueEntries.length}* nama`,
    `Waiting List dalam queue: *${parsedBulkImport.waitingListNames.length}*`,
  ];

  if (duplicateNames.length > 0) {
    replyLines.push("", `Duplicate: ${summarizeNames(duplicateNames)}`);
  }

  if (unmatchedNames.length > 0) {
    replyLines.push("", `Tidak dipadankan: ${summarizeNames(unmatchedNames)}`);
  }

  await sendWhatsAppReply(replyTarget, buildReplyMessage(replyLines.join("\n")));

  return {
    success: true,
    message: `Import selesai. ${inserts.length} berjaya, ${duplicateNames.length} duplicate, ${unmatchedNames.length} tidak dipadankan, queue ${queueEntries.length} nama.`,
  };
}

async function handleJoinBlokRequest(
  supabaseAdmin: SupabaseAdminClient,
  memberSender: string,
  replyTarget: string
): Promise<WebhookResponse> {
  const member = await findMatchingMemberByPhone(supabaseAdmin, memberSender);

  if (!member) {
    await sendWhatsAppReply(
      replyTarget,
      buildReplyMessage("Nombor WhatsApp anda tidak sepadan dengan mana-mana ahli berdaftar.")
    );

    return {
      success: false,
      message: "Nombor WhatsApp tidak sepadan dengan mana-mana ahli berdaftar",
    };
  }

  const activeGameResult = await findActiveBlokJoinGame(supabaseAdmin);

  if (!activeGameResult.game) {
    await sendWhatsAppReply(
      replyTarget,
      buildReplyMessage(activeGameResult.reason || "Tiada senarai BLOK aktif untuk join sekarang.")
    );

    return {
      success: false,
      message: activeGameResult.reason || "Tiada senarai BLOK aktif",
    };
  }

  if (isPastBlokDate(activeGameResult.game.game_date)) {
    await sendWhatsAppReply(
      replyTarget,
      buildReplyMessage("Maaf, tarikh blok dah lepas. Harap maklum.")
    );

    return {
      success: false,
      message: "Tarikh BLOK aktif sudah lepas",
    };
  }

  const queueEntries = await getBlokJoinQueueEntries(supabaseAdmin, activeGameResult.game.id);
  const queueMember = {
    id: member.id,
    username: member.username || member.full_name,
    fullName: member.full_name,
  };

  if (hasMemberInBlokJoinQueue(queueEntries, queueMember)) {
    await sendWhatsAppReply(
      replyTarget,
      buildReplyMessage(
        `${queueMember.username}, nama anda telah ada dalam list BLOK ${formatIsoDateToDisplay(activeGameResult.game.game_date)}.`
      )
    );

    return {
      success: true,
      message: `${queueMember.username} sudah ada dalam queue BLOK aktif`,
    };
  }

  const placement = await appendMemberToBlokJoinQueue(
    supabaseAdmin,
    activeGameResult.game.id,
    queueMember
  );

  const placementText =
    placement.queueGroup === "main"
      ? `slot utama nombor *${placement.displayPosition}*`
      : `Waiting List nombor *${placement.displayPosition}*`;

  await sendWhatsAppReply(
    replyTarget,
    buildReplyMessage(
      `${queueMember.username}, anda berjaya masuk ${placementText} untuk BLOK *${formatIsoDateToDisplay(activeGameResult.game.game_date)}*.`
    )
  );

  return {
    success: true,
    message: `${queueMember.username} berjaya join ${placementText}`,
  };
}

async function handleStatusBlokRequest(
  supabaseAdmin: SupabaseAdminClient,
  memberSender: string,
  replyTarget: string
): Promise<WebhookResponse> {
  const member = await findMatchingMemberByPhone(supabaseAdmin, memberSender);

  if (!member) {
    await sendWhatsAppReply(
      replyTarget,
      buildReplyMessage("Nombor WhatsApp anda tidak sepadan dengan mana-mana ahli berdaftar.")
    );

    return {
      success: false,
      message: "Nombor WhatsApp tidak sepadan dengan mana-mana ahli berdaftar",
    };
  }

  const activeGameResult = await findActiveBlokJoinGame(supabaseAdmin);

  if (!activeGameResult.game) {
    await sendWhatsAppReply(
      replyTarget,
      buildReplyMessage(activeGameResult.reason || "Tiada senarai BLOK aktif untuk semakan sekarang.")
    );

    return {
      success: false,
      message: activeGameResult.reason || "Tiada senarai BLOK aktif",
    };
  }

  if (isPastBlokDate(activeGameResult.game.game_date)) {
    await sendWhatsAppReply(
      replyTarget,
      buildReplyMessage("Maaf, tarikh blok dah lepas. Harap maklum.")
    );

    return {
      success: false,
      message: "Tarikh BLOK aktif sudah lepas",
    };
  }

  const queueEntries = await getBlokJoinQueueEntries(supabaseAdmin, activeGameResult.game.id);
  const queueMember = {
    id: member.id,
    username: member.username || member.full_name,
    fullName: member.full_name,
  };
  const queueEntry = findBlokJoinQueueEntry(queueEntries, queueMember);

  if (!queueEntry) {
    await sendWhatsAppReply(
      replyTarget,
      buildReplyMessage(
        `${queueMember.username}, anda belum berada dalam queue BLOK *${formatIsoDateToDisplay(activeGameResult.game.game_date)}*.`
      )
    );

    return {
      success: true,
      message: `${queueMember.username} belum berada dalam queue BLOK aktif`,
    };
  }

  const placement = buildQueuePlacement(queueEntry.queue_position);
  const placementText =
    placement.queueGroup === "main"
      ? `slot utama nombor *${placement.displayPosition}*`
      : `Waiting List nombor *${placement.displayPosition}*`;

  await sendWhatsAppReply(
    replyTarget,
    buildReplyMessage(
      `${queueMember.username}, kedudukan anda sekarang ialah ${placementText} untuk BLOK *${formatIsoDateToDisplay(activeGameResult.game.game_date)}*.`
    )
  );

  return {
    success: true,
    message: `${queueMember.username} berada di ${placementText}`,
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
  let replyTarget = "";
  let shouldReply = false;

  try {
    const webhookData = req.body as FonteWebhookData;
    const senderContext = extractSenderContext(webhookData);
    sender = senderContext.memberSender;
    replyTarget = senderContext.replyTarget || senderContext.memberSender;
    console.log("=== WHATSAPP WEBHOOK PAYLOAD ===", JSON.stringify(webhookData, null, 2));
    console.log("=== WHATSAPP WEBHOOK SENDER CONTEXT ===", senderContext);
    const messageText = extractMessageText(webhookData);
    const parsedBulkImport = parseAmbcBlokImport(messageText);
    const parsedSingleCommand = parseBlokCommand(messageText);
    const parsedJoinCommand = parseJoinBlokCommand(messageText);
    const parsedStatusCommand = parseStatusCommand(messageText);
    console.log("=== WHATSAPP WEBHOOK COMMAND MATCH ===", {
      messageText,
      replyTarget,
      memberSender: sender,
      parsedBulkImportStatus: parsedBulkImport?.status || null,
      parsedSingleCommandStatus: parsedSingleCommand?.status || null,
      parsedJoinCommandStatus: parsedJoinCommand?.status || null,
      parsedStatusCommandStatus: parsedStatusCommand?.status || null,
    });
    await logProductionWebhookTrigger({
      replyTarget,
      memberSender: sender,
      groupId: senderContext.groupId,
      messageText,
      parsedBulkImportStatus: parsedBulkImport?.status || null,
      parsedSingleCommandStatus: parsedSingleCommand?.status || null,
      parsedJoinCommandStatus: parsedJoinCommand?.status || null,
      parsedStatusCommandStatus: parsedStatusCommand?.status || null,
    });
    shouldReply =
      parsedBulkImport !== null ||
      parsedSingleCommand !== null ||
      parsedJoinCommand !== null ||
      parsedStatusCommand !== null;

    if (!parsedBulkImport && !parsedSingleCommand && !parsedJoinCommand && !parsedStatusCommand) {
      return res.status(200).json({
        success: true,
        message: "Webhook received - no matching blok command",
      });
    }

    if (parsedBulkImport?.status === "missing_date") {
      await sendWhatsAppReply(
        replyTarget,
        buildReplyMessage("Tarikh tidak ditemui dalam mesej #ambcblok. Sila sertakan format dd.mm.yyyy.")
      );

      return res.status(200).json({
        success: false,
        message: "Tarikh tidak ditemui dalam mesej #ambcblok",
      });
    }

    if (parsedBulkImport?.status === "invalid_date" || parsedSingleCommand?.status === "invalid_date") {
      const rawDate = parsedBulkImport?.status === "invalid_date" ? parsedBulkImport.rawDate : parsedSingleCommand?.rawDate;

      await sendWhatsAppReply(
        replyTarget,
        buildReplyMessage(`Tarikh *${rawDate}* tidak sah. Sila guna format tarikh yang betul.`)
      );

      return res.status(200).json({
        success: false,
        message: `Tarikh ${rawDate} tidak sah`,
      });
    }

    if (parsedBulkImport?.status === "no_players") {
      await sendWhatsAppReply(
        replyTarget,
        buildReplyMessage("Senarai pemain utama tidak ditemui sebelum bahagian Waiting List.")
      );

      return res.status(200).json({
        success: false,
        message: "Tiada senarai pemain utama ditemui",
      });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    if (!supabaseAdmin) {
      await sendWhatsAppReply(
        replyTarget,
        buildReplyMessage("Pendaftaran BLOK tidak dapat diproses sekarang. Konfigurasi server belum lengkap.")
      );

      return res.status(200).json({
        success: false,
        message: "Webhook received but Supabase admin configuration is incomplete",
      });
    }

    const result =
      parsedBulkImport?.status === "valid"
        ? await handleBulkAmbcBlokImport(supabaseAdmin, replyTarget, parsedBulkImport)
        : parsedJoinCommand?.status === "valid"
          ? await handleJoinBlokRequest(supabaseAdmin, sender, replyTarget)
          : parsedStatusCommand?.status === "valid"
            ? await handleStatusBlokRequest(supabaseAdmin, sender, replyTarget)
            : await handleSingleBlokRegistration(
                supabaseAdmin,
                sender,
                replyTarget,
                parsedSingleCommand as Extract<ParsedBlokCommand, { status: "valid" }>
              );

    return res.status(200).json(result);
  } catch (error) {
    console.error("=== WEBHOOK PROCESSING ERROR ===", error);

    if (shouldReply && replyTarget) {
      await sendWhatsAppReply(
        replyTarget,
        buildReplyMessage("Pendaftaran BLOK tidak dapat diproses sekarang. Sila cuba semula sebentar lagi.")
      );
    }

    return res.status(200).json({
      success: false,
      message: "Webhook processing error",
    });
  }
}