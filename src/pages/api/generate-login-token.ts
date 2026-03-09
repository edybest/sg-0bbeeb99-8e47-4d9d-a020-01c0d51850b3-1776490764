import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { username, memberId } = req.body;

    if (!username && !memberId) {
      return res.status(400).json({ error: "Username or memberId required" });
    }

    console.log("Generate login token request:", { username, memberId });

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get member by username or memberId
    let query = supabaseAdmin
      .from("members")
      .select("user_id, username, email");

    if (memberId) {
      query = query.eq("id", memberId);
    } else if (username) {
      query = query.ilike("username", username.trim());
    }

    const { data: member, error: memberError } = await query.maybeSingle();

    console.log("Member lookup result:", { member, error: memberError });

    if (memberError) {
      console.error("Error finding member:", memberError);
      return res.status(500).json({ 
        error: "Database error", 
        details: memberError.message 
      });
    }

    if (!member || !member.user_id) {
      console.log("Member not found");
      return res.status(404).json({ error: "Member tidak dijumpai" });
    }

    console.log("Member found:", { user_id: member.user_id, email: member.email });

    // Get user email from auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(
      member.user_id
    );

    console.log("Auth user lookup:", { 
      user_id: member.user_id, 
      email: authUser?.user?.email,
      error: authError 
    });

    if (authError || !authUser.user) {
      console.error("Error getting user:", authError);
      return res.status(500).json({ 
        error: "User tidak dijumpai",
        details: authError?.message 
      });
    }

    const userEmail = authUser.user.email;

    if (!userEmail) {
      return res.status(400).json({ error: "Email tidak dijumpai untuk user ini" });
    }

    // Generate magic link
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: userEmail,
    });

    console.log("Magic link generation:", {
      email: userEmail,
      success: !!magicLinkData,
      error: magicLinkError,
      hasTokenHash: !!magicLinkData?.properties?.hashed_token
    });

    if (magicLinkError || !magicLinkData) {
      console.error("Error generating magic link:", magicLinkError);
      return res.status(500).json({ 
        error: "Gagal generate token login",
        details: magicLinkError?.message 
      });
    }

    const tokenHash = magicLinkData.properties?.hashed_token;

    if (!tokenHash) {
      console.error("No token hash in magic link data");
      return res.status(500).json({ error: "Token hash tidak dijumpai" });
    }

    console.log("Login token generated successfully");

    return res.status(200).json({
      success: true,
      email: userEmail,
      token_hash: tokenHash,
    });
  } catch (error) {
    console.error("Generate login token error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}