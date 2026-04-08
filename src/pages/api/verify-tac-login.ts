import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

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
  details?: any;
  debug?: any;
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
      console.log("⚠️ Member has no linked auth user, creating one...");
      
      // Create auth user for this member
      const { data: newAuthUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        phone: cleanPhone,
        phone_confirm: true,
        user_metadata: {
          username: member.username,
          full_name: member.full_name,
          member_id: member.id,
        },
      });

      if (createUserError || !newAuthUser.user) {
        console.error("❌ Failed to create auth user:", createUserError);
        return res.status(500).json({
          success: false,
          error: "Failed to create user account",
        });
      }

      console.log("✅ Auth user created:", newAuthUser.user.id);

      // Update member with new user_id
      const { error: updateError } = await supabaseAdmin
        .from("members")
        .update({ user_id: newAuthUser.user.id })
        .eq("id", member.id);

      if (updateError) {
        console.error("❌ Failed to link user to member:", updateError);
        return res.status(500).json({
          success: false,
          error: "Failed to link user account",
        });
      }

      console.log("✅ Member linked to auth user");

      // Update member object with new user_id
      member.user_id = newAuthUser.user.id;
    }

    // Create a session for the user using Admin API generateLink (faster & more reliable)
    try {
      console.log("🔐 Step 1: Generating session tokens via Admin API...");
      console.log("🔐 User ID:", member.user_id);
      
      // Use Admin API to generate magic link tokens (faster than password method)
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: `${member.user_id}@ambc.app`, // Use user_id as email (won't be sent)
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/member`,
        }
      });

      if (linkError || !linkData) {
        console.error("❌ Failed to generate session link:", linkError);
        
        // Fallback to temp password method if generateLink fails
        console.log("⚠️ Falling back to temp password method...");
        
        const tempPassword = crypto.randomUUID() + crypto.randomUUID();
        
        const { error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(
          member.user_id,
          { password: tempPassword }
        );

        if (updatePasswordError) {
          console.error("❌ Failed to update temporary password:", updatePasswordError);
          throw new Error("Failed to prepare session");
        }
        
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
        
        const authPhone = cleanPhone.replace("+", "");
        
        const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
          phone: authPhone,
          password: tempPassword,
        });

        if (signInError || !signInData.session) {
          console.error("❌ Failed to generate session tokens");
          console.error("SIGN IN ERROR:", JSON.stringify(signInError, null, 2));
          
          return res.status(500).json({
            success: false,
            error: "Failed to generate session tokens",
            details: signInError || "No session data returned",
            debug: {
              hasError: !!signInError,
              hasData: !!signInData,
              hasSession: !!signInData?.session,
              errorMessage: signInError?.message,
              errorCode: signInError?.code,
              errorStatus: signInError?.status,
            }
          });
        }

        console.log("✅ Session tokens generated via password fallback");

        return res.status(200).json({
          success: true,
          message: "Login successful",
          data: {
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
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

      console.log("✅ Step 1: Session link generated successfully");

      // Extract tokens from the properties object
      const accessToken = linkData.properties?.access_token;
      const refreshToken = linkData.properties?.refresh_token;

      if (!accessToken || !refreshToken) {
        console.error("❌ Missing tokens in generateLink response");
        throw new Error("Failed to extract session tokens");
      }

      console.log("✅ Session tokens extracted successfully:", {
        userId: member.user_id,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
      });

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          access_token: accessToken,
          refresh_token: refreshToken,
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
      console.error("\n❌❌❌ SESSION CREATION FAILED ❌❌❌");
      console.error("Error type:", sessionError instanceof Error ? sessionError.constructor.name : typeof sessionError);
      console.error("Error message:", sessionError instanceof Error ? sessionError.message : String(sessionError));
      console.error("Error stack:", sessionError instanceof Error ? sessionError.stack : "No stack trace");
      console.error("Member info:", {
        id: member.id,
        username: member.username,
        user_id: member.user_id,
        phone: cleanPhone,
      });
      
      return res.status(500).json({
        success: false,
        error: sessionError instanceof Error ? sessionError.message : "Failed to create session",
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