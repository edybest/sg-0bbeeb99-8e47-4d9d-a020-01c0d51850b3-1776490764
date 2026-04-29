import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("\n✅ TEST WEBHOOK CALLED");
  console.log("Method:", req.method);
  console.log("Body:", JSON.stringify(req.body, null, 2));
  console.log("Headers:", JSON.stringify(req.headers, null, 2));

  return res.status(200).json({
    success: true,
    message: "Test webhook working!",
    timestamp: new Date().toISOString(),
  });
}