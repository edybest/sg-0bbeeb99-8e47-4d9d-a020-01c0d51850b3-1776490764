import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Logout and destroy session
 * POST /api/auth/logout
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get session token from cookie
    const sessionToken = req.cookies.ambc_session;

    if (sessionToken) {
      // Delete session from database
      await supabaseAdmin
        .from("member_sessions")
        .delete()
        .eq("session_token", sessionToken);
    }

    // Clear session cookie
    res.setHeader(
      "Set-Cookie",
      "ambc_session=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0"
    );

    return res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });

  } catch (error) {
    console.error("Error during logout:", error);
    
    // Always clear cookie even if DB delete fails
    res.setHeader(
      "Set-Cookie",
      "ambc_session=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0"
    );

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
}