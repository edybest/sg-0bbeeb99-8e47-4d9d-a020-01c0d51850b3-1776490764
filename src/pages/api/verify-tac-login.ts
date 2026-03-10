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

    // Normalize phone format to match what was stored during send-whatsapp-tac
    const phoneRegex = /^(\+?6?01)[0-46-9]-*[0-9]{7,8}$/;
    let cleanPhone = phone.replace(/\s+/g, "").replace(/-/g, "");
    
    if (!cleanPhone.startsWith("+")) {
      if (cleanPhone.startsWith("01")) {
        cleanPhone = "+6" + cleanPhone;
      } else if (cleanPhone.startsWith("6")) {
        cleanPhone = "+" + cleanPhone;
      }
    }

    console.log("Phone (normalized):", cleanPhone);

    if (!phoneRegex.test(cleanPhone.replace("+", ""))) {
      console.log("❌ Invalid phone format");
      return res.status(400).json({
        success: false,
        error: "Format nombor telefon tidak sah",
      });
    }

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
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (memberError || !member) {
      console.error("❌ Member not found");
      return res.status(404).json({
        success: false,
        error: "Member tidak dijumpai",
      });
    }

    console.log("✅ Member found:", {
      id: member.id,
      username: member.username,
      stored_tac: member.tac_code,
      provided_tac: code,
      tac_expiry: member.tac_expiry,
    });

    // Verify TAC code
    if (!member.tac_code || member.tac_code !== code) {
      console.log("❌ Invalid TAC code");
      console.log("Stored TAC:", member.tac_code);
      console.log("Provided TAC:", code);
      console.log("Match:", member.tac_code === code);
      
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

    // Create a session for the user using admin API
    try {
      // Use admin.getUserById to get the auth user
      const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(
        member.user_id
      );

      if (userError || !authUser) {
        console.error("❌ Failed to get auth user:", userError);
        throw new Error("Failed to authenticate user");
      }

      console.log("✅ Auth user retrieved:", authUser.user.id);

      // Generate access token for the user
      const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: authUser.user.phone || `${member.user_id}@temp.local`, // Use phone or temp email
        options: {
          redirectTo: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        },
      });

      if (sessionError || !sessionData) {
        console.error("❌ Failed to generate session:", sessionError);
        throw sessionError;
      }

      console.log("✅ Session link generated");

      // Extract the hashed token and verify it to get proper session tokens
      const hashedToken = sessionData.properties.hashed_token;

      if (!hashedToken) {
        console.error("❌ No hashed token in response");
        throw new Error("Failed to generate session token");
      }

      // Verify the OTP to get proper session tokens
      const { data: verifyData, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
        type: "magiclink",
        token_hash: hashedToken,
      });

      if (verifyError || !verifyData?.session) {
        console.error("❌ Failed to verify OTP:", verifyError);
        throw verifyError;
      }

      console.log("✅ Session created successfully");

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          access_token: verifyData.session.access_token,
          refresh_token: verifyData.session.refresh_token,
          user: {
            id: member.user_id,
            username: member.username,
            full_name: member.full_name,
            is_admin: member.is_admin || false,
            phone: cleanPhone,
          },
        },
      });

    } catch (sessionError) {
      console.error("❌ Session creation failed:", sessionError);
      
      // Fallback: Return user data without tokens
      // Client can use this to create session on their end
      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: member.user_id,
            username: member.username,
            full_name: member.full_name,
            is_admin: member.is_admin || false,
            phone: cleanPhone,
          },
        },
      });
    }

  } catch (error) {
    console.error("\n=== ERROR ===");
    console.error("Error:", error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
}