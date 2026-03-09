import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type VerifyTACRequest = {
  username: string;
  code: string;
};

type VerifyTACResponse = {
  success: boolean;
  message?: string;
  member?: {
    id: string;
    username: string;
    full_name: string;
    is_admin: boolean;
  };
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerifyTACResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const { username, code } = req.body as VerifyTACRequest;

    if (!username || !code) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    console.log("\n=== VERIFY TAC LOGIN REQUEST ===");
    console.log("Username:", username);
    console.log("TAC Code:", code);

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Find member with matching username
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("id, username, full_name, is_admin, tac_code, tac_expiry")
      .ilike("username", username.trim())
      .maybeSingle();

    if (memberError) {
      console.error("❌ Database error:", memberError);
      return res.status(500).json({
        success: false,
        error: "Database error",
      });
    }

    if (!member) {
      console.log("❌ Member not found");
      return res.status(404).json({
        success: false,
        error: "Username tidak dijumpai",
      });
    }

    console.log("✅ Member found:", {
      id: member.id,
      username: member.username,
      has_tac: !!member.tac_code,
      tac_expiry: member.tac_expiry,
    });

    // Verify TAC code
    if (!member.tac_code || member.tac_code !== code) {
      console.log("❌ Invalid TAC code");
      return res.status(400).json({
        success: false,
        error: "Kod TAC tidak sah",
      });
    }

    // Check if TAC expired
    if (!member.tac_expiry || new Date(member.tac_expiry) < new Date()) {
      console.log("❌ TAC code expired");
      
      // Clear expired TAC
      await supabaseAdmin
        .from("members")
        .update({
          tac_code: null,
          tac_expiry: null,
        })
        .eq("id", member.id);
      
      return res.status(400).json({
        success: false,
        error: "Kod TAC telah tamat tempoh",
      });
    }

    console.log("✅ TAC code valid and not expired");

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Create session in database
    const { error: sessionError } = await supabaseAdmin
      .from("member_sessions")
      .insert({
        member_id: member.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        user_agent: req.headers["user-agent"] || null,
        ip_address: (req.headers["x-forwarded-for"] as string)?.split(",")[0] || 
                   req.socket.remoteAddress || null,
      });

    if (sessionError) {
      console.error("❌ Failed to create session:", sessionError);
      return res.status(500).json({
        success: false,
        error: "Failed to create session",
      });
    }

    console.log("✅ Session created:", {
      member_id: member.id,
      expires_at: expiresAt.toISOString(),
    });

    // Clear TAC code after successful verification
    await supabaseAdmin
      .from("members")
      .update({
        tac_code: null,
        tac_expiry: null,
      })
      .eq("id", member.id);

    // Set session cookie manually
    const isProd = process.env.NODE_ENV === "production";
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    const cookie = `session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProd ? '; Secure' : ''}`;

    res.setHeader("Set-Cookie", cookie);

    console.log("✅ TAC verification successful - Session created");

    return res.status(200).json({
      success: true,
      message: "Login successful",
      member: {
        id: member.id,
        username: member.username,
        full_name: member.full_name,
        is_admin: member.is_admin || false,
      },
    });

  } catch (error) {
    console.error("\n=== ERROR VERIFYING TAC ===");
    console.error("Error:", error);
    console.error("Stack:", error instanceof Error ? error.stack : "No stack trace");

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
}