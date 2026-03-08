import type { NextApiRequest, NextApiResponse } from "next";

const FONNTE_API_URL = "https://api.fonnte.com/send";
const FONNTE_TOKEN = process.env.FONNTE_API_TOKEN || "";

type SendTACRequest = {
  phone: string;
  code: string;
  username: string;
};

type SendTACResponse = {
  success: boolean;
  message?: string;
  data?: {
    messageId?: string;
    status?: string;
  };
  error?: string;
};

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
    const { phone, code, username } = req.body as SendTACRequest;

    // Validate required fields
    if (!phone || !code || !username) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: phone, code, or username",
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

    // Format phone number (remove any + or spaces)
    const formattedPhone = phone.replace(/[+\s-]/g, "");

    // Create WhatsApp message with formatting
    const message = `🎯 *AMBC CLUB - Kod Pengesahan Login*

Hai ${username}! 👋

Kod TAC anda adalah:

*${code}*

Kod ini sah untuk 5 minit sahaja.

⚠️ Jangan kongsikan kod ini dengan sesiapa.

Terima kasih! 🎳`;

    console.log("\n=== SENDING WHATSAPP TAC VIA FONNTE ===");
    console.log("Target Phone:", formattedPhone);
    console.log("Username:", username);
    console.log("TAC Code:", code);
    console.log("API URL:", FONNTE_API_URL);

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