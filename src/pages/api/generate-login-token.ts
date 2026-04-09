import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({ error: "Member ID is required" });
    }

    // Create admin Supabase client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get member details
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("user_id, email, username")
      .eq("id", memberId)
      .maybeSingle();

    if (memberError || !member) {
      console.error("Member not found:", memberError);
      return res.status(404).json({ error: "Member not found" });
    }

    if (!member.user_id) {
      return res.status(400).json({ error: "Member does not have a linked user account" });
    }

    // Generate OTP token for this user
    const { data: otpData, error: otpError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: member.email,
    });

    if (otpError || !otpData) {
      console.error("Error generating OTP:", otpError);
      return res.status(500).json({ error: "Failed to generate login token" });
    }

    // The hashed_token is directly available in the response
    const tokenHash = otpData.properties.hashed_token;

    if (!tokenHash) {
      console.error("Token data:", otpData);
      return res.status(500).json({ error: "Failed to extract token from response" });
    }

    console.log(`✅ Generated login token for member: ${member.username} (${member.email})`);

    return res.status(200).json({ 
      success: true,
      token: tokenHash,
      email: member.email,
      username: member.username
    });

  } catch (error: any) {
    console.error("Error in generate-login-token:", error);
    return res.status(500).json({ 
      error: error.message || "Internal server error" 
    });
  }
}