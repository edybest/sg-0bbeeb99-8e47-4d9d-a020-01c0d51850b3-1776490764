import { supabase } from "@/integrations/supabase/client";

const WHATSAPP_API_URL = "https://my.usahawin.com/api/v1/whatsapp/send";
const WHATSAPP_API_TOKEN = "DGmUft7uckBRncA6VxWj8vYND8IqaBCoWmmssHHFa80c90f6";

/**
 * Generate random 6-digit TAC code
 */
function generateTACCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Format phone number to international format (+60...)
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, "");
  
  // If starts with 0, replace with 60
  if (cleaned.startsWith("0")) {
    cleaned = "60" + cleaned.substring(1);
  }
  
  // If doesn't start with 60, add it
  if (!cleaned.startsWith("60")) {
    cleaned = "60" + cleaned;
  }
  
  // Add + prefix
  return "+" + cleaned;
}

/**
 * Store TAC code in database with expiry (5 minutes)
 */
async function storeTACCode(memberId: string, tacCode: string) {
  const expiryTime = new Date();
  expiryTime.setMinutes(expiryTime.getMinutes() + 5);

  // Store in members table (temporary field)
  const { error } = await supabase
    .from("members")
    .update({
      tac_code: tacCode,
      tac_expiry: expiryTime.toISOString(),
    })
    .eq("id", memberId);

  if (error) throw error;
}

/**
 * Send WhatsApp TAC code via my.usahawin.com API
 */
async function sendWhatsAppTAC(phoneNumber: string, tacCode: string, username: string) {
  const formattedPhone = formatPhoneNumber(phoneNumber);
  
  const message = `🎳 *AMBC CLUB*\n\nKod TAC anda: *${tacCode}*\n\nUsername: ${username}\n\nKod ini sah selama 5 minit.\nJangan kongsi kod ini dengan sesiapa.\n\n_Abaikan mesej ini jika anda tidak membuat permintaan._`;

  try {
    const response = await fetch(WHATSAPP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${WHATSAPP_API_TOKEN}`,
      },
      body: JSON.stringify({
        phone: formattedPhone,
        message: message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to send WhatsApp message");
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("WhatsApp API error:", error);
    throw new Error(error.message || "Gagal menghantar kod TAC ke WhatsApp");
  }
}

/**
 * Verify TAC code
 */
async function verifyTACCode(memberId: string, tacCode: string) {
  const { data: member, error } = await supabase
    .from("members")
    .select("tac_code, tac_expiry")
    .eq("id", memberId)
    .single();

  if (error || !member) {
    return { valid: false, error: "Member tidak dijumpai" };
  }

  if (!member.tac_code || !member.tac_expiry) {
    return { valid: false, error: "Tiada kod TAC dijumpai. Sila hantar kod TAC baharu." };
  }

  // Check if expired
  const now = new Date();
  const expiry = new Date(member.tac_expiry);
  
  if (now > expiry) {
    return { valid: false, error: "Kod TAC telah tamat tempoh. Sila hantar kod baharu." };
  }

  // Check if code matches
  if (member.tac_code !== tacCode) {
    return { valid: false, error: "Kod TAC tidak sah. Sila cuba lagi." };
  }

  // Clear TAC after successful verification
  await supabase
    .from("members")
    .update({
      tac_code: null,
      tac_expiry: null,
    })
    .eq("id", memberId);

  return { valid: true, error: null };
}

export const whatsappService = {
  generateTACCode,
  formatPhoneNumber,
  storeTACCode,
  sendWhatsAppTAC,
  verifyTACCode,
};