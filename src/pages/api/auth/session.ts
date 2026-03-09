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
 * Get current session
 * GET /api/auth/session
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get session token from cookie
    const sessionToken = req.cookies.ambc_session;

    if (!sessionToken) {
      return res.status(401).json({
        error: "No session found"
      });
    }

    // Get session from database
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("member_sessions")
      .select("*, members(*)")
      .eq("session_token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (sessionError || !session) {
      return res.status(401).json({
        error: "Invalid or expired session"
      });
    }

    // Update last accessed time
    await supabaseAdmin
      .from("member_sessions")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", session.id);

    return res.status(200).json({
      success: true,
      data: {
        member: session.members,
        session: {
          id: session.id,
          expiresAt: session.expires_at
        }
      }
    });

  } catch (error) {
    console.error("Error getting session:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
}