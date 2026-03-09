import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const FONNTE_API_URL = "https://api.fonnte.com/send";
const FONNTE_TOKEN = process.env.FONNTE_API_TOKEN || "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type SendTACRequest = {
  phone: string;
  username: string;
};

type SendTACResponse = {
  success: boolean;
  message?: string;
  data?: {
    messageId?: string;
    status?: string;
    memberId?: string;
  };
  error?: string;
};

// Generate random 6-digit TAC code
function generateTACCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendTACResponse>
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed - Only POST requests accepted",
    });
  }

  try {
    const { phone, username } = req.body as SendTACRequest;

    // Validate required fields
    if (!phone || !username) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: phone or username",
      });
    }

    // Validate Fonnte token
    if (!FONNTE_TOKEN) {
      console.error("❌ FONNTE_API_TOKEN not configured in environment variables");
      return res.status(500).json({
        success: false,
        error: "WhatsApp service not configured",
      });
    }

    console.log("\n=== SEND WHATSAPP TAC REQUEST ===");
    console.log("Username:", username);
    console.log("Phone:", phone);

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Find member by username
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("id, username, phone, user_id")
      .ilike("username", username.trim())
      .maybeSingle();

    console.log("Member lookup result:", { member, error: memberError });

    if (memberError) {
      console.error("❌ Database error:", memberError);
      return res.status(500).json({
        success: false,
        error: "Database error - Sila cuba lagi",
      });
    }

    if (!member) {
      console.log("❌ Member not found with username:", username);
      return res.status(404).json({
        success: false,
        error: "Username tidak dijumpai dalam sistem",
      });
    }

    // Validate phone number matches (normalize both for comparison)
    const normalizePhone = (p: string) => p.replace(/[\s\-+]/g, "");
    const memberPhone = normalizePhone(member.phone || "");
    const inputPhone = normalizePhone(phone);

    console.log("Phone validation:", {
      memberPhone,
      inputPhone,
      match: memberPhone.includes(inputPhone) || inputPhone.includes(memberPhone),
    });

    if (!memberPhone.includes(inputPhone) && !inputPhone.includes(memberPhone)) {
      console.log("❌ Phone number mismatch");
      return res.status(400).json({
        success: false,
        error: "Nombor telefon tidak sepadan dengan username dalam sistem",
      });
    }

    console.log("✅ Member found:", {
      id: member.id,
      username: member.username,
      has_user_id: !!member.user_id,
    });

    // Generate TAC code
    const code = generateTACCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    // Store TAC code in members table
    const { error: updateError } = await supabaseAdmin
      .from("members")
      .update({
        tac_code: code,
        tac_expiry: expiresAt.toISOString(),
      })
      .eq("id", member.id);

    if (updateError) {
      console.error("❌ Failed to store TAC code:", updateError);
      return res.status(500).json({
        success: false,
        error: "Failed to generate TAC code",
      });
    }

    console.log("✅ TAC code stored in members table:", {
      member_id: member.id,
      code: code,
      expires_at: expiresAt.toISOString(),
    });

    // Format phone number (remove any + or spaces)
    const formattedPhone = phone.replace(/[+\s-]/g, "");

    // Create WhatsApp message with formatting
    const message = `🎯 *AMBC CLUB - Kod Pengesahan Login*

Hai ${username}! 👋

Kod TAC anda adalah:

*${code}*

Kod ini sah untuk 10 minit sahaja.

⚠️ Jangan kongsikan kod ini dengan sesiapa.

Terima kasih! 🎳`;

    console.log("\n=== SENDING WHATSAPP TAC VIA FONNTE ===");
    console.log("Target Phone:", formattedPhone);
    console.log("Username:", username);
    console.log("TAC Code:", code);
    console.log("Member ID:", member.id);
    console.log("Expires At:", expiresAt.toISOString());

    // Prepare Fonnte request
    const fonteRequest = {
      target: formattedPhone,
      message: message,
      countryCode: "60", // Malaysia country code
    };

    console.log("Request Payload:", JSON.stringify(fonteRequest, null, 2));

    // Send request to Fonnte API
    const response = await fetch(FONNTE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": FONNTE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fonteRequest),
    });

    const responseText = await response.text();
    console.log("\n=== FONNTE API RESPONSE ===");
    console.log("Status:", response.status);
    console.log("Status Text:", response.statusText);
    console.log("Response Body:", responseText);

    // Parse response
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse response as JSON:", e);
      responseData = { detail: responseText };
    }

    // Check if request was successful
    if (!response.ok) {
      console.error("❌ Fonnte API Error:", responseData);
      
      // Clear TAC code if WhatsApp failed to send
      await supabaseAdmin
        .from("members")
        .update({
          tac_code: null,
          tac_expiry: null,
        })
        .eq("id", member.id);
      
      return res.status(response.status).json({
        success: false,
        error: responseData.reason || responseData.detail || "Failed to send WhatsApp message",
        data: responseData,
      });
    }

    // Success response from Fonnte
    console.log("✅ WhatsApp TAC sent successfully via Fonnte");
    console.log("Response Data:", JSON.stringify(responseData, null, 2));

    return res.status(200).json({
      success: true,
      message: "WhatsApp TAC sent successfully",
      data: {
        messageId: responseData.id || responseData.message_id,
        status: responseData.status || "sent",
        memberId: member.id,
      },
    });

  } catch (error) {
    console.error("\n=== ERROR SENDING WHATSAPP TAC ===");
    console.error("Error:", error);
    console.error("Stack:", error instanceof Error ? error.stack : "No stack trace");

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}