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
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username diperlukan" });
    }

    console.log("Generate login token request for username:", username);

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get member by username
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("user_id")
      .eq("username", username.trim())
      .maybeSingle();

    console.log("Member lookup result:", { member, error: memberError });

    if (memberError) {
      console.error("Error finding member:", memberError);
      return res.status(500).json({ error: "Database error" });
    }

    if (!member || !member.user_id) {
      console.log("Member not found for username:", username);
      return res.status(404).json({ error: "Member tidak dijumpai" });
    }

    console.log("Member found, user_id:", member.user_id);

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
      return res.status(500).json({ error: "User tidak dijumpai" });
    }

    const userEmail = authUser.user.email;

    if (!userEmail) {
      return res.status(400).json({ error: "Email tidak dijumpai untuk user ini" });
    }

    // Generate magic link token
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
      return res.status(500).json({ error: "Gagal generate token login" });
    }

    // Extract token hash from the hashed_token
    const tokenHash = magicLinkData.properties?.hashed_token;

    if (!tokenHash) {
      console.error("No token hash in magic link data");
      return res.status(500).json({ error: "Token hash tidak dijumpai" });
    }

    console.log("Login token generated successfully for:", username);

    // Return email and token hash to client
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