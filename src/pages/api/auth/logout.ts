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
    const sessionToken = req.cookies.session_token;

    if (sessionToken) {
      // Delete session from database
      await supabaseAdmin
        .from("member_sessions")
        .delete()
        .eq("session_token", sessionToken);
    }

    // Clear session cookie - manual string format
    const isProd = process.env.NODE_ENV === "production";
    const cookie = `session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? '; Secure' : ''}`;
    
    res.setHeader("Set-Cookie", cookie);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });

  } catch (error) {
    console.error("Error during logout:", error);
    
    // Always clear cookie even if DB delete fails - manual string format
    const isProd = process.env.NODE_ENV === "production";
    const cookie = `session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? '; Secure' : ''}`;
    
    res.setHeader("Set-Cookie", cookie);

    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
}