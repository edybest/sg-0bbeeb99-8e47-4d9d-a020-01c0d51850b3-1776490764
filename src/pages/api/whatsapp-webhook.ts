import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// ─── Constants ───────────────────────────────────────────────────────────────
const FONNTE_API_URL = "https://api.fonnte.com/send";
const FONNTE_TOKEN = process.env.FONNTE_API_TOKEN || "";
const FONNTE_DEVICE_ID = process.env.FONNTE_DEVICE_ID || "";

// ─── Helper Functions ────────────────────────────────────────────────────────

function normalizeComparablePhone(rawPhone: string): string {
  let cleaned = rawPhone.replace(/[@.]/g, "");
  cleaned = cleaned.replace(/\s+/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.startsWith("60")) {
    return cleaned;
  }
  if (cleaned.startsWith("0")) {
    return "60" + cleaned.substring(1);
  }
  return cleaned;
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
    `   Papar ranking blok ringkas\n` +
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

// ─── Supabase Helper ─────────────────────────────────────────────────────────

async function getConfiguredFonnteGroupId(supabaseAdmin: ReturnType<typeof createClient>): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("club_settings")
    .select("setting_value")
    .eq("setting_key", "fonnte_group_id")
    .maybeSingle();

  if (error) {
    console.error("❌ Error fetching fonnte_group_id from club_settings:", error);
    return "";
  }

  return (data?.setting_value as string) || "";
}

// ─── Command Handlers ────────────────────────────────────────────────────────

async function handleBlokCommand(
  dateStr: string | undefined,
  supabaseAdmin: ReturnType<typeof createClient>,
  compact = false
): Promise<string> {
  let targetDate: string | null = null;

  if (dateStr) {
    targetDate = parseDateVariants(dateStr);
    if (!targetDate) {
      return "❌ Format tarikh tidak sah.\n\nContoh: #blok 22.04.2026";
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

  const { data: games, error: gameError } = await query.limit(1).maybeSingle();

  if (gameError || !games) {
    console.error("Error fetching game:", gameError);
    return targetDate
      ? `❌ Tiada game BLOK pada ${targetDate}.`
      : "❌ Tiada game BLOK ditemui.";
  }

  const playersQuery = await supabaseAdmin
    .from("game_players")
    .select(`
      id,
      game1_score,
      game2_score,
      game3_score,
      game4_score,
      game5_score,
      handicap,
      total_score,
      overall_score,
      members!game_players_member_id_fkey (id, username, full_name)
    `)
    .eq("game_id", games.id);

  if (playersQuery.error || !playersQuery.data) {
    console.error("Error fetching players:", playersQuery.error);
    return `❌ Game "${games.game_name}" belum ada skor.`;
  }

  const scores = playersQuery.data.map((p: any) => ({
    ...p,
    member: p.members
  }));

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

async function handleTop5Command(
  dateStr: string | undefined,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<string> {
  let targetDate: string | null = null;

  if (dateStr) {
    targetDate = parseDateVariants(dateStr);
    if (!targetDate) {
      return "❌ Format tarikh tidak sah.\n\nContoh: #top5 20.03.2026";
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

  const { data: games, error: gameError } = await query.limit(1).maybeSingle();

  if (gameError || !games) {
    console.error("Error fetching game:", gameError);
    return targetDate
      ? `❌ Tiada game BLOK pada ${targetDate}.`
      : "❌ Tiada game BLOK ditemui.";
  }

  const playersQuery = await supabaseAdmin
    .from("game_players")
    .select(`
      id,
      overall_score,
      game1_score,
      game2_score,
      game3_score,
      game4_score,
      game5_score,
      members!game_players_member_id_fkey (id, username)
    `)
    .eq("game_id", games.id);

  if (playersQuery.error || !playersQuery.data) {
    console.error("Error fetching players:", playersQuery.error);
    return `❌ Game "${games.game_name}" belum ada skor.`;
  }

  const scores = playersQuery.data.map((p: any) => ({
    ...p,
    member: p.members
  }));

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
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<string> {
  const normalizedPhone = normalizeComparablePhone(sender);

  const { data: member, error: memberError } = await supabaseAdmin
    .from("members")
    .select("id, username")
    .eq("phone_number", normalizedPhone)
    .maybeSingle();

  if (memberError || !member) {
    return "❌ Nombor telefon anda tidak dijumpai dalam sistem AMBC.\n\nSila hubungi admin untuk pendaftaran.";
  }

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

  const { data: score, error: scoreError } = await supabaseAdmin
    .from("game_players")
    .select("id")
    .eq("game_id", latestGame.id)
    .eq("member_id", member.id)
    .maybeSingle();

  if (scoreError || !score) {
    return `❌ Anda tidak join blok terkini.\n\n*${latestGame.game_name}*\n📅 ${formatDateMY(latestGame.game_date)}`;
  }

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

// ─── Command Processor ───────────────────────────────────────────────────────

async function processCommand(
  message: string,
  sender: string,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<string> {
  const trimmed = message.trim();
  const lowerMessage = trimmed.toLowerCase();

  // #help command
  if (lowerMessage === "#help") {
    return getHelpMessage();
  }

  // #top5 or #top 5 command
  const top5Match = lowerMessage.match(/^#top\s*5\s*([\d./-]+)?/);
  if (top5Match) {
    const dateStr = top5Match[1];
    return await handleTop5Command(dateStr, supabaseAdmin);
  }

  // #lane command
  if (lowerMessage === "#lane") {
    return await handleLaneCommand(sender, supabaseAdmin);
  }

  // #blok or #blokambc command
  const blokMatch = lowerMessage.match(/^#blok(?:ambc)?\s*([\d./-]+)?/);
  if (blokMatch) {
    const dateStr = blokMatch[1];
    return await handleBlokCommand(dateStr, supabaseAdmin, true);
  }

  return "❌ Command tidak dikenali.\n\nTaip *#help* untuk senarai command.";
}

// ─── WhatsApp Reply Function ─────────────────────────────────────────────────

async function sendWhatsAppReply(
  replyTarget: string,
  message: string,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<void> {
  const isGroupTarget = replyTarget.includes("@g.us");
  
  let target: string;
  if (isGroupTarget) {
    const configuredGroupId = await getConfiguredFonnteGroupId(supabaseAdmin);
    target = configuredGroupId || replyTarget;
  } else {
    target = normalizeComparablePhone(replyTarget);
  }

  if (!target) {
    console.warn("⚠️ WhatsApp auto-reply skipped because target is empty");
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

    const response = await fetch(FONNTE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": FONNTE_TOKEN,
        "Content-Type": "application/json",
      },
      body: requestBody,
    });

    if (!response) {
      throw new Error("Failed to get response from Fonnte API");
    }

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

// ─── Main Handler ────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  console.log("🔔 Webhook received at:", new Date().toISOString());

  const { device, sender, message } = req.body;

  if (!sender || !message) {
    console.warn("⚠️ Missing required fields: sender or message");
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  console.log("📥 Webhook payload:", JSON.stringify({ device, sender, message }, null, 2));

  try {
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const replyMessage = await processCommand(message, sender, supabaseAdmin);
    
    if (replyMessage) {
      await sendWhatsAppReply(sender, replyMessage, supabaseAdmin);
    }

    return res.status(200).json({ success: true, message: "Webhook processed successfully" });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    return res.status(200).json({ success: false, message: "Webhook processing error" });
  }
}