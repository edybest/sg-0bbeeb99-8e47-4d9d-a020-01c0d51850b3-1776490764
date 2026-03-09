import type { NextApiRequest, NextApiResponse } from "next";

type FonteWebhookData = {
  device?: string;
  sender?: string;
  message?: string;
  member?: {
    jid: string;
    name: string;
  };
  data?: {
    body: string;
    from: string;
  };
  status?: string;
  id?: string;
};

type WebhookResponse = {
  success: boolean;
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WebhookResponse>
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed - Only POST requests accepted",
    });
  }

  try {
    const webhookData = req.body as FonteWebhookData;

    console.log("\n=== FONNTE WEBHOOK RECEIVED ===");
    console.log("Timestamp:", new Date().toISOString());
    // Mute logs for headers and body to keep server logs clean
    // console.log("Headers:", JSON.stringify(req.headers, null, 2));
    // console.log("Body:", JSON.stringify(webhookData, null, 2));

    // Extract message info from Fonnte webhook
    const sender = webhookData.sender || webhookData.member?.jid || webhookData.data?.from;
    const messageText = webhookData.message || webhookData.data?.body;
    const status = webhookData.status;

    if (sender) {
      console.log("📱 Sender:", sender);
    }

    if (status) {
      console.log("📊 Status:", status);
    }

    // Always return 200 OK to acknowledge webhook receipt
    // This prevents Fonnte from retrying the webhook
    return res.status(200).json({
      success: true,
      message: "Webhook received and processed successfully",
    });

  } catch (error) {
    console.error("\n=== WEBHOOK PROCESSING ERROR ===");
    console.error("Error:", error);

    // Even on error, return 200 to prevent webhook retries
    // Log the error but acknowledge receipt
    return res.status(200).json({
      success: false,
      message: "Webhook processing error",
    });
  }
}