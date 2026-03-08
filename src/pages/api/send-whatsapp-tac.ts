import type { NextApiRequest, NextApiResponse } from "next";

const WHATSAPP_API_URL = "https://wasenderapi.com/api/device/sendMessage";
const WHATSAPP_API_KEY = "e23496fcb29374cafa1e66bb58203f64a52855a7dc67ac5240841be1c839afda";

type SendTACRequest = {
  phone: string;
  message: string;
};

type SendTACResponse = {
  success: boolean;
  error?: string;
  data?: unknown;
  debug?: {
    requestUrl: string;
    requestBody: unknown;
    responseStatus: number;
    responseBody: string;
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendTACResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ 
      success: false, 
      error: "Method not allowed" 
    });
  }

  try {
    const { phone, message } = req.body as SendTACRequest;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: "Phone and message are required",
      });
    }

    // Format phone number - try both with and without + prefix
    const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
    
    const requestUrl = `${WHATSAPP_API_URL}?api_key=${WHATSAPP_API_KEY}`;
    const requestBody = {
      number: formattedPhone,
      message: message,
    };

    console.log("\n=== WHATSAPP TAC REQUEST ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Phone (original):", phone);
    console.log("Phone (formatted):", formattedPhone);
    console.log("Request URL:", WHATSAPP_API_URL);
    console.log("Request Body:", JSON.stringify(requestBody, null, 2));
    console.log("API Key (first 20 chars):", WHATSAPP_API_KEY.substring(0, 20) + "...");

    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    
    console.log("\n=== WHATSAPP API RESPONSE ===");
    console.log("Status:", response.status);
    console.log("Status Text:", response.statusText);
    console.log("Headers:", Object.fromEntries(response.headers.entries()));
    console.log("Body (raw):", responseText);
    console.log("Body (length):", responseText.length);

    let data;
    try {
      data = JSON.parse(responseText);
      console.log("Body (parsed):", JSON.stringify(data, null, 2));
    } catch (e) {
      console.error("❌ Failed to parse response as JSON");
      console.error("Response was:", responseText.substring(0, 500));
      return res.status(500).json({
        success: false,
        error: "Invalid response from WhatsApp API",
        debug: {
          requestUrl: WHATSAPP_API_URL,
          requestBody,
          responseStatus: response.status,
          responseBody: responseText.substring(0, 500),
        },
      });
    }

    if (!response.ok) {
      console.error("❌ WhatsApp API Error");
      console.error("Error Data:", data);
      return res.status(response.status).json({
        success: false,
        error: data.message || data.error || "Failed to send WhatsApp message",
        debug: {
          requestUrl: WHATSAPP_API_URL,
          requestBody,
          responseStatus: response.status,
          responseBody: responseText,
        },
      });
    }

    console.log("✅ WhatsApp TAC sent successfully");
    console.log("Response Data:", data);
    console.log("=== END ===\n");

    return res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error("\n❌ SERVER ERROR");
    console.error("Error:", error);
    console.error("Error Type:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("Error Message:", error instanceof Error ? error.message : String(error));
    console.error("Stack:", error instanceof Error ? error.stack : "No stack trace");
    console.log("=== END ===\n");
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}