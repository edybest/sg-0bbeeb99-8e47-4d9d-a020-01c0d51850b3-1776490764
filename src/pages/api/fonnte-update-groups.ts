import type { NextApiRequest, NextApiResponse } from "next";

/**
 * API endpoint untuk update WhatsApp group list di Fonnte
 * Panggil endpoint ini untuk sync group list supaya webhook boleh terima mesej dari group
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const FONNTE_API_TOKEN = process.env.FONNTE_API_TOKEN;

  if (!FONNTE_API_TOKEN) {
    console.error("FONNTE_API_TOKEN not configured");
    return res.status(500).json({
      success: false,
      error: "Fonnte API token not configured",
    });
  }

  try {
    console.log("Updating Fonnte group list...");

    const response = await fetch("https://api.fonnte.com/update-group", {
      method: "POST",
      headers: {
        Authorization: FONNTE_API_TOKEN,
      },
    });

    const data = await response.json();
    console.log("Fonnte update group response:", data);

    if (!response.ok) {
      console.error("Failed to update group list:", data);
      return res.status(response.status).json({
        success: false,
        error: data.reason || "Failed to update group list",
        details: data,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Group list updated successfully",
      data: data,
    });
  } catch (error) {
    console.error("Error updating group list:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update group list",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}