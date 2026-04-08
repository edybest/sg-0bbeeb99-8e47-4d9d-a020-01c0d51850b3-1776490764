import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

type Member = Database["public"]["Tables"]["members"]["Row"];

/**
 * Generate a random 6-digit TAC code
 */
function generateTACCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Format phone number to international format (+60 or +65)
 */
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  
  if (cleaned.startsWith("0")) {
    cleaned = "6" + cleaned;
  }
  
  if (!cleaned.startsWith("60") && !cleaned.startsWith("65") && cleaned.length > 0) {
    cleaned = "60" + cleaned; // Fallback to Malaysia if invalid
  }
  
  return cleaned;
}

/**
 * Store TAC code in database with 5-minute expiry
 */
async function storeTACCode(memberId: string, tacCode: string): Promise<void> {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 5);

  const { error } = await supabase
    .from("members")
    .update({
      tac_code: tacCode,
      tac_expiry: expiry.toISOString(),
    })
    .eq("id", memberId);

  if (error) {
    console.error("Error storing TAC code:", error);
    throw new Error("Failed to store TAC code");
  }
}

/**
 * Verify TAC code from database
 */
async function verifyTACCode(
  memberId: string,
  tacCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: member, error } = await supabase
      .from("members")
      .select("tac_code, tac_expiry")
      .eq("id", memberId)
      .single();

    if (error || !member) {
      return { success: false, error: "Member tidak dijumpai" };
    }

    if (!member.tac_code || !member.tac_expiry) {
      return { success: false, error: "Kod TAC tidak dijumpai. Sila minta kod baru." };
    }

    if (member.tac_code !== tacCode) {
      return { success: false, error: "Kod TAC tidak sah" };
    }

    const expiryTime = new Date(member.tac_expiry);
    const now = new Date();
    if (now > expiryTime) {
      return { success: false, error: "Kod TAC telah tamat tempoh. Sila minta kod baru." };
    }

    await supabase
      .from("members")
      .update({
        tac_code: null,
        tac_expiry: null,
        is_verified: true,
      })
      .eq("id", memberId);

    return { success: true };
  } catch (error) {
    console.error("Error verifying TAC code:", error);
    return { success: false, error: "Ralat sistem. Sila cuba lagi." };
  }
}

/**
 * Send WhatsApp TAC code via our server-side API route
 */
async function sendWhatsAppTAC(
  phone: string,
  tacCode: string,
  username: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const formattedPhone = formatPhoneNumber(phone);
    
    const message = `🎯 *AMBC CLUB - Kod Pengesahan Login*

Hai ${username}! 👋

Kod TAC anda adalah:

*${tacCode}*

Kod ini sah untuk 5 minit sahaja.

⚠️ Jangan kongsikan kod ini dengan sesiapa.

Terima kasih! 🎳`;

    console.log("Sending WhatsApp TAC request to server API for:", formattedPhone);

    const response = await fetch("/api/send-whatsapp-tac", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: formattedPhone,
        message: message,
      }),
    });

    const data = await response.json();
    console.log("Server API Response:", { status: response.status, data });

    if (!response.ok || !data.success) {
      console.error("Failed to send WhatsApp TAC:", data);
      return {
        success: false,
        error: data.error || "Gagal menghantar mesej WhatsApp. Sila cuba lagi.",
      };
    }

    console.log("WhatsApp TAC sent successfully");
    return { success: true };
  } catch (error) {
    console.error("Error sending WhatsApp TAC:", error);
    return {
      success: false,
      error: "Ralat sistem. Sila cuba lagi.",
    };
  }
}

export const whatsappService = {
  storeTACCode,
  verifyTACCode,
  sendWhatsAppTAC,
  generateTACCode,
  formatPhoneNumber,
};