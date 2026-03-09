import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username diperlukan" });
    }

    // Use service role key to bypass RLS and generate magic link
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    // 1. Get user_id from members table using username
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("user_id")
      .eq("username", username)
      .single();

    if (memberError || !member) {
      console.error("Member lookup error:", memberError);
      return res.status(404).json({ error: "Member tidak dijumpai" });
    }

    // 2. Get user email from Auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      member.user_id
    );

    if (userError || !userData.user || !userData.user.email) {
      console.error("User lookup error:", userError);
      return res.status(404).json({ error: "Email member tidak dijumpai" });
    }

    const email = userData.user.email;

    // 3. Generate magic link token hash
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: email,
    });

    if (linkError || !linkData.properties?.hashed_token) {
      console.error("Generate link error:", linkError);
      return res.status(500).json({ error: "Gagal menjana token login" });
    }

    // Return the email and token hash to client
    return res.status(200).json({
      success: true,
      email: email,
      token_hash: linkData.properties.hashed_token,
    });
  } catch (error) {
    console.error("Generate login token error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}