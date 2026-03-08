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
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Body:", JSON.stringify(webhookData, null, 2));
    console.log("=== END WEBHOOK ===\n");

    // Extract message info from Fonnte webhook
    const sender = webhookData.sender || webhookData.member?.jid || webhookData.data?.from;
    const messageText = webhookData.message || webhookData.data?.body;
    const status = webhookData.status;
    const messageId = webhookData.id;

    if (sender) {
      console.log("📱 Sender:", sender);
    }

    if (messageText) {
      console.log("💬 Message:", messageText);
    }

    if (status) {
      console.log("📊 Status:", status);
      
      // Handle different message statuses
      switch (status.toLowerCase()) {
        case "sent":
          console.log("✅ Message sent successfully");
          break;
        case "delivered":
          console.log("✅ Message delivered to recipient");
          break;
        case "read":
          console.log("✅ Message read by recipient");
          break;
        case "failed":
          console.error("❌ Message failed to send");
          break;
        default:
          console.log("ℹ️ Status:", status);
      }
    }

    if (messageId) {
      console.log("🆔 Message ID:", messageId);
    }

    // Additional webhook processing can be added here
    // For example:
    // - Store delivery status in database
    // - Track message analytics
    // - Handle incoming replies
    // - Update member communication history

    // Always return 200 OK to acknowledge webhook receipt
    // This prevents Fonnte from retrying the webhook
    return res.status(200).json({
      success: true,
      message: "Webhook received and processed successfully",
    });

  } catch (error) {
    console.error("\n=== WEBHOOK PROCESSING ERROR ===");
    console.error("Error:", error);
    console.error("Stack:", error instanceof Error ? error.stack : "No stack trace");

    // Even on error, return 200 to prevent webhook retries
    // Log the error but acknowledge receipt
    return res.status(200).json({
      success: false,
      message: "Webhook processing error",
    });
  }
}