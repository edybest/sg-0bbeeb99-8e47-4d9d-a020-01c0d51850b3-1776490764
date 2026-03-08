import type { NextApiRequest, NextApiResponse } from "next";

type WebhookResponse = {
  success: boolean;
  message: string;
  received?: unknown;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WebhookResponse>
) {
  // Only accept POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ 
      success: false, 
      message: "Method not allowed - Only POST accepted" 
    });
  }

  try {
    const webhookData = req.body;

    console.log("\n=== WHATSAPP WEBHOOK RECEIVED ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Body:", JSON.stringify(webhookData, null, 2));
    console.log("=== END WEBHOOK ===\n");

    // Process webhook based on event type
    if (webhookData.event) {
      console.log("Event Type:", webhookData.event);
      
      switch (webhookData.event) {
        case "message.sent":
          console.log("✅ Message sent successfully");
          break;
        case "message.delivered":
          console.log("✅ Message delivered to recipient");
          break;
        case "message.read":
          console.log("✅ Message read by recipient");
          break;
        case "message.failed":
          console.error("❌ Message failed:", webhookData.error);
          break;
        default:
          console.log("ℹ️ Unknown event type:", webhookData.event);
      }
    }

    // Store webhook data if needed
    // You can add database storage here to track message delivery status

    // Always return 200 OK to acknowledge webhook receipt
    return res.status(200).json({
      success: true,
      message: "Webhook received and processed",
      received: webhookData,
    });
  } catch (error) {
    console.error("\n❌ WEBHOOK ERROR");
    console.error("Error:", error);
    console.error("Error Type:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("Error Message:", error instanceof Error ? error.message : String(error));
    console.log("=== END WEBHOOK ERROR ===\n");
    
    // Still return 200 to prevent webhook retries
    return res.status(200).json({
      success: false,
      message: "Webhook processing error",
    });
  }
}