import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

type Member = Database["public"]["Tables"]["members"]["Row"];

const WHATSAPP_API_URL = "https://wasenderapi.com/api/v1/messages";
const WHATSAPP_API_KEY = "e23496fcb29374cafa1e66bb58203f64a52855a7dc67ac5240841be1c839afda";

interface WhatsAppResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    status: string;
  };
  error?: string;
}

function generateTACCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  
  if (cleaned.startsWith("0")) {
    cleaned = "60" + cleaned.substring(1);
  } else if (!cleaned.startsWith("60")) {
    cleaned = "60" + cleaned;
  }
  
  return cleaned;
}

function formatWhatsAppMessage(username: string, tacCode: string): string {
  return `🎯 *AMBC CLUB - Kod Pengesahan Login*

Hai ${username}! 👋

Kod TAC anda adalah:

*${tacCode}*

Kod ini sah untuk 5 minit sahaja.

⚠️ Jangan kongsikan kod ini dengan sesiapa.

Terima kasih! 🎳`;
}

export const whatsappService = {
  storeTACCode: async (memberId: string, tacCode: string): Promise<boolean> => {
    try {
      // 5 minutes expiry
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 5);

      const { error } = await supabase
        .from("members")
        .update({
          tac_code: tacCode,
          tac_expiry: expiry.toISOString(),
        })
        .eq("id", memberId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error storing TAC code:", error);
      throw error;
    }
  },

  verifyTACCode: async (memberId: string, tacCode: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      const { data: member, error } = await supabase
        .from("members")
        .select("tac_code, tac_expiry")
        .eq("id", memberId)
        .single();

      if (error || !member) {
        return { valid: false, error: "Member tidak dijumpai" };
      }

      if (!member.tac_code || member.tac_code !== tacCode) {
        return { valid: false, error: "Kod TAC tidak sah" };
      }

      if (!member.tac_expiry || new Date(member.tac_expiry) < new Date()) {
        return { valid: false, error: "Kod TAC telah tamat tempoh. Sila minta kod baru." };
      }

      // Clear TAC after successful verification
      await supabase
        .from("members")
        .update({
          tac_code: null,
          tac_expiry: null,
        })
        .eq("id", memberId);

      return { valid: true };
    } catch (error) {
      console.error("Error verifying TAC code:", error);
      return { valid: false, error: "Ralat sistem semasa verify TAC" };
    }
  },

  sendWhatsAppTAC: async (phone: string, tacCode: string, username: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!phone) {
        return { 
          success: false, 
          error: "Nombor telefon tidak dijumpai." 
        };
      }

      const formattedPhone = formatPhoneNumber(phone);
      const message = formatWhatsAppMessage(username, tacCode);

      console.log("Sending WhatsApp TAC to:", formattedPhone);

      const response = await fetch(WHATSAPP_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${WHATSAPP_API_KEY}`,
        },
        body: JSON.stringify({
          phone: formattedPhone,
          text: message,
        }),
      });

      const data = await response.json() as WhatsAppResponse;

      if (!response.ok || !data.success) {
        console.error("WhatsApp API error:", data);
        return { 
          success: false, 
          error: data.error || data.message || "Gagal menghantar mesej WhatsApp. Sila cuba lagi." 
        };
      }

      console.log("WhatsApp TAC sent successfully!");
      return { success: true };

    } catch (error) {
      console.error("Error sending WhatsApp TAC:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Ralat sistem. Sila cuba lagi." 
      };
    }
  },

  generateTACCode,
  formatPhoneNumber,
};