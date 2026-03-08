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

    console.log("Sending WhatsApp TAC via server to:", phone);

    const response = await fetch(
      `${WHATSAPP_API_URL}?api_key=${WHATSAPP_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: phone,
          message: message,
        }),
      }
    );

    const responseText = await response.text();
    console.log("WhatsApp API Response:", {
      status: response.status,
      statusText: response.statusText,
      body: responseText.substring(0, 200),
    });

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse response as JSON:", responseText);
      return res.status(500).json({
        success: false,
        error: "Invalid response from WhatsApp API",
      });
    }

    if (!response.ok) {
      console.error("WhatsApp API Error:", data);
      return res.status(response.status).json({
        success: false,
        error: data.message || "Failed to send WhatsApp message",
      });
    }

    console.log("WhatsApp TAC sent successfully via server");
    return res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error("Server error sending WhatsApp TAC:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}