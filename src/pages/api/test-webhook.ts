import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Test webhook dengan phone number sebenar dari database
  const testPhone = "+60197746464"; // NJ's phone from database
  const testMessage = "#join";

  console.log("🧪 Testing webhook with:", { sender: testPhone, message: testMessage });

  try {
    // Call webhook endpoint directly using local URL
    const webhookUrl = "http://localhost:3000/api/whatsapp-webhook";

    console.log("📞 Calling webhook at:", webhookUrl);

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

    console.log("✅ Webhook response status:", response.status);
    console.log("✅ Webhook response data:", data);

    // Also check what the webhook would normalize the phone to
    const normalizedPhone = testPhone.replace(/[@.]/g, "").replace(/\s+/g, "");
    const cleanedPhone = normalizedPhone.startsWith("+") ? normalizedPhone.slice(1) : normalizedPhone;
    
    console.log("📱 Phone normalization test:");
    console.log("  - Original:", testPhone);
    console.log("  - After cleanup:", normalizedPhone);
    console.log("  - Final (no +):", cleanedPhone);

    return res.status(200).json({
      success: true,
      message: "Test completed - check console and logs/webhook-production.log",
      webhookResponse: data,
      phoneNormalization: {
        original: testPhone,
        normalized: normalizedPhone,
        final: cleanedPhone,
      },
    });
  } catch (error) {
    console.error("❌ Test error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}