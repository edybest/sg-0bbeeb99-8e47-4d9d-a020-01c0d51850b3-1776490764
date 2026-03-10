import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type VerifyTACRequest = {
  phone: string;
  code: string;
};

type VerifyTACResponse = {
  success: boolean;
  message?: string;
  data?: {
    access_token?: string;
    refresh_token?: string;
    user?: any;
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
    const { phone, code } = req.body as VerifyTACRequest;

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    console.log("\n=== VERIFY TAC REQUEST ===");
    console.log("Phone:", phone);
    console.log("Code:", code);

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Find member by phone and verify TAC
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("id, username, full_name, is_admin, user_id, tac_code, tac_expiry")
      .eq("phone", phone)
      .maybeSingle();

    if (memberError || !member) {
      console.error("❌ Member not found");
      return res.status(404).json({
        success: false,
        error: "Member tidak dijumpai",
      });
    }

    // Verify TAC code
    if (!member.tac_code || member.tac_code !== code) {
      console.log("❌ Invalid TAC code");
      return res.status(400).json({
        success: false,
        error: "Kod TAC tidak sah",
      });
    }

    // Check expiry
    if (!member.tac_expiry || new Date(member.tac_expiry) < new Date()) {
      console.log("❌ TAC expired");
      
      await supabaseAdmin
        .from("members")
        .update({ tac_code: null, tac_expiry: null })
        .eq("id", member.id);
      
      return res.status(400).json({
        success: false,
        error: "Kod TAC telah tamat tempoh",
      });
    }

    console.log("✅ TAC verified successfully");

    // Clear TAC after verification
    await supabaseAdmin
      .from("members")
      .update({ tac_code: null, tac_expiry: null })
      .eq("id", member.id);

    if (!member.user_id) {
      console.error("❌ Member has no linked auth user");
      return res.status(500).json({
        success: false,
        error: "Account configuration error",
      });
    }

    // Create session for the user using admin API
    // Generate an access token that the client can use
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: `${member.username}@temp.ambc.club`, // Temporary email for session generation
    });

    if (sessionError || !sessionData) {
      console.error("❌ Failed to create session:", sessionError);
      
      // Fallback: Use updateUserById to ensure user exists, then create manual session
      const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(member.user_id);
      
      if (userError || !user) {
        console.error("❌ Failed to get user:", userError);
        return res.status(500).json({
          success: false,
          error: "Failed to create session",
        });
      }

      // Return user data for client-side session creation
      console.log("✅ Using fallback session method");
      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: member.user_id,
            username: member.username,
            full_name: member.full_name,
            is_admin: member.is_admin || false,
            phone: phone,
          },
        },
      });
    }

    console.log("✅ Session created successfully");

    // Extract tokens from the magic link properties
    const properties = sessionData.properties;
    
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        access_token: properties?.access_token,
        refresh_token: properties?.refresh_token,
        user: {
          id: member.user_id,
          username: member.username,
          full_name: member.full_name,
          is_admin: member.is_admin || false,
          phone: phone,
        },
      },
    });

  } catch (error) {
    console.error("\n=== ERROR ===");
    console.error("Error:", error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
}