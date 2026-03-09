import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

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
 * Verify TAC and create session
 * POST /api/verify-tac-login
 * Body: { memberId, code }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { memberId, code } = req.body;

    console.log("\n=== VERIFY TAC LOGIN REQUEST ===");
    console.log("Member ID:", memberId);
    console.log("Code received:", code);

    // Validate input
    if (!memberId || !code) {
      return res.status(400).json({
        error: "Member ID and TAC code are required"
      });
    }

    // Get member details
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("id, username, full_name, phone, is_admin")
      .eq("id", memberId)
      .maybeSingle();

    if (memberError || !member) {
      console.error("❌ Member not found:", memberError);
      return res.status(404).json({
        error: "Member not found"
      });
    }

    console.log("✅ Member found:", member.username);

    // Verify TAC code from whatsapp_tac_codes table
    const { data: tacRecord, error: tacError } = await supabaseAdmin
      .from("whatsapp_tac_codes")
      .select("*")
      .eq("member_id", memberId)
      .eq("code", code.trim())
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    console.log("TAC lookup result:", { tacRecord, tacError });

    if (tacError) {
      console.error("❌ Database error checking TAC:", tacError);
      return res.status(500).json({
        error: "Database error checking TAC"
      });
    }

    if (!tacRecord) {
      console.log("❌ Invalid or expired TAC code");
      return res.status(400).json({
        error: "Invalid or expired TAC code"
      });
    }

    console.log("✅ TAC code valid:", tacRecord.code);

    // Mark TAC as used
    const { error: updateError } = await supabaseAdmin
      .from("whatsapp_tac_codes")
      .update({ used: true })
      .eq("id", tacRecord.id);

    if (updateError) {
      console.error("⚠️ Failed to mark TAC as used:", updateError);
      // Continue anyway - don't block login
    }

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    console.log("Creating session with token:", sessionToken.substring(0, 10) + "...");

    // Create session in database
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("member_sessions")
      .insert({
        member_id: member.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error("❌ Error creating session:", sessionError);
      return res.status(500).json({
        error: "Failed to create session"
      });
    }

    console.log("✅ Session created successfully:", session.id);

    // Set session cookie (7 days = 604800 seconds)
    const cookieValue = `ambc_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=604800`;
    res.setHeader("Set-Cookie", cookieValue);

    console.log("✅ Cookie set:", cookieValue.substring(0, 50) + "...");

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        member: {
          id: member.id,
          username: member.username,
          full_name: member.full_name,
          phone: member.phone,
          is_admin: member.is_admin
        },
        sessionToken: sessionToken,
        expiresAt: expiresAt.toISOString()
      }
    });

  } catch (error) {
    console.error("\n=== ERROR VERIFYING TAC ===");
    console.error("Error:", error);
    console.error("Stack:", error instanceof Error ? error.stack : "No stack trace");
    
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
}