import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Test webhook dengan phone number sebenar dari database
  const testPhone = "+60197746464"; // NJ's phone from database
  const testMessage = "#join";

  console.log("🧪 Testing webhook with:", { sender: testPhone, message: testMessage });

  try {
    // Call webhook endpoint
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const webhookUrl = `${baseUrl}/api/whatsapp-webhook`;

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: testPhone,
        message: testMessage,
      }),
    });

    const data = await response.json();

    console.log("✅ Webhook response:", data);

    return res.status(200).json({
      success: true,
      message: "Test completed - check logs/webhook-production.log for details",
      webhookResponse: data,
    });
  } catch (error) {
    console.error("❌ Test error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}