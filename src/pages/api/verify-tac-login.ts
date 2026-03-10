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
    session?: any;
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

    // Create session token using admin API
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: `${member.username}@temp.ambc.club`,
    });

    if (sessionError) {
      console.error("❌ Failed to create session:", sessionError);
      return res.status(500).json({
        success: false,
        error: "Failed to create session",
      });
    }

    console.log("✅ Session link generated successfully");

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        session: sessionData,
        user: {
          id: member.user_id,
          username: member.username,
          full_name: member.full_name,
          is_admin: member.is_admin || false,
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