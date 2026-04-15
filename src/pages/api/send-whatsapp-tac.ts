import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const FONNTE_API_URL = "https://api.fonnte.com/send";
const FONNTE_TOKEN = process.env.FONNTE_API_TOKEN || "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type SendTACRequest = {
  phone: string;
};

type SendTACResponse = {
  success: boolean;
  message?: string;
  data?: {
    messageId?: string;
    status?: string;
  };
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendTACResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const { phone } = req.body as SendTACRequest;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: "Missing phone number",
      });
    }

    if (!FONNTE_TOKEN) {
      console.error("❌ FONNTE_API_TOKEN not configured");
      return res.status(500).json({
        success: false,
        error: "WhatsApp service not configured",
      });
    }

    console.log("\n=== SEND WHATSAPP TAC REQUEST ===");
    console.log("Phone (original):", phone);

    // Normalize phone format to match +60 or +65
    const phoneRegex = /^\+(60|65)\d{8,10}$/;
    let cleanPhone = phone.replace(/\D/g, "");
    
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "6" + cleanPhone;
    } else if (!cleanPhone.startsWith("6") && cleanPhone.length > 0) {
      cleanPhone = "60" + cleanPhone;
    }
    
    if (cleanPhone) {
      cleanPhone = "+" + cleanPhone;
    }

    console.log("Phone (normalized):", cleanPhone);

    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      console.log("❌ Invalid phone format");
      return res.status(400).json({
        success: false,
        error: "Format nombor telefon tidak sah. Gunakan format bermula dengan +60 atau +65.",
      });
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if member exists with this phone number - try multiple formats
    console.log("Searching for member with phone:", cleanPhone);
    
    // Try format 1: +60... (normalized)
    let { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("id, username, phone, user_id, full_name")
      .eq("phone", cleanPhone)
      .maybeSingle();

    // If not found, try format 2: without + prefix (60...)
    if (!member && !memberError && cleanPhone.startsWith("+")) {
      const phoneWithoutPlus = cleanPhone.substring(1);
      console.log("Trying phone without +:", phoneWithoutPlus);
      
      const result = await supabaseAdmin
        .from("members")
        .select("id, username, phone, user_id, full_name")
        .eq("phone", phoneWithoutPlus)
        .maybeSingle();
      
      member = result.data;
      memberError = result.error;
    }

    // If still not found, try format 3: with leading 0 (0123456789)
    if (!member && !memberError && cleanPhone.length > 3) {
      const phoneWithZero = "0" + cleanPhone.substring(3); // +60123... → 0123...
      console.log("Trying phone with leading 0:", phoneWithZero);
      
      const result = await supabaseAdmin
        .from("members")
        .select("id, username, phone, user_id, full_name")
        .eq("phone", phoneWithZero)
        .maybeSingle();
      
      member = result.data;
      memberError = result.error;
    }

    if (memberError) {
      console.error("❌ Database error:", memberError);
      return res.status(500).json({
        success: false,
        error: "Ralat pangkalan data",
      });
    }

    if (!member) {
      console.log("❌ Member not found with any phone format");
      console.log("Tried formats:", cleanPhone, cleanPhone.substring(1), "0" + cleanPhone.substring(3));
      
      // List all available phone numbers for debugging (only in development)
      if (process.env.NODE_ENV === "development") {
        const { data: allMembers } = await supabaseAdmin
          .from("members")
          .select("username, phone")
          .not("phone", "is", null)
          .limit(5);
        
        console.log("Available phone numbers in database:", allMembers?.map(m => m.phone));
      }
      
      return res.status(404).json({
        success: false,
        error: `Nombor telefon tidak dijumpai dalam sistem. Sila hubungi admin untuk mendaftar.`,
      });
    }

    console.log("✅ Member found:", {
      id: member.id,
      username: member.username,
      has_user_id: !!member.user_id,
    });

    // Step 1: Ensure auth user exists with phone number
    let authUserId = member.user_id;
    
    if (!authUserId) {
      // Create new auth user with phone
      console.log("Creating Supabase Auth user with phone...");
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        phone: cleanPhone,
        phone_confirm: true,
        user_metadata: {
          member_id: member.id,
          full_name: member.full_name,
          username: member.username,
        }
      });

      if (authError) {
        console.error("❌ Failed to create auth user:", authError);
        return res.status(500).json({
          success: false,
          error: "Failed to create auth user",
        });
      }

      authUserId = authData.user.id;

      // Link auth user to member
      await supabaseAdmin
        .from("members")
        .update({ user_id: authUserId })
        .eq("id", member.id);

      console.log("✅ Auth user created and linked:", authUserId);
    } else {
      // Update existing auth user to ensure phone is set
      console.log("Updating existing auth user with phone...");
      
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUserId,
        { phone: cleanPhone, phone_confirm: true }
      );

      if (updateError) {
        console.log("⚠️ Could not update phone (might already exist):", updateError.message);
        // Continue anyway - phone might already be set
      } else {
        console.log("✅ Auth user phone updated");
      }
    }

    // Step 2: Generate OTP - We'll create our own 6-digit code since Supabase doesn't expose OTP directly
    console.log("Generating OTP code...");
    
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Store OTP in member record for verification
    await supabaseAdmin
      .from("members")
      .update({
        tac_code: otpCode,
        tac_expiry: expiresAt.toISOString(),
      })
      .eq("id", member.id);

    console.log("✅ OTP generated and stored:", {
      member_id: member.id,
      code: otpCode,
      expires_at: expiresAt.toISOString(),
    });

    // Step 3: Send OTP to WhatsApp via Fonnte
    const formattedPhone = phone.replace(/[+\s-]/g, "");

    const message = `🎯 *AMBC CLUB - Kod Pengesahan Login*

Hai ${member.full_name || member.username}! 👋

Kod TAC anda adalah:

*${otpCode}*

Kod ini sah untuk 10 minit sahaja.

⚠️ Jangan kongsikan kod ini dengan sesiapa.

Terima kasih! 🎳`;

    console.log("\n=== SENDING WHATSAPP TAC ===");
    console.log("Target Phone:", formattedPhone);
    console.log("OTP Code:", otpCode);

    const fonteRequest = {
      target: formattedPhone,
      message: message,
      countryCode: "60",
    };

    const response = await fetch(FONNTE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": FONNTE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fonteRequest),
    });

    const responseText = await response.text();
    console.log("Fonnte Response:", response.status, responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { detail: responseText };
    }

    if (!response.ok) {
      console.error("❌ Fonnte API Error:", responseData);
      
      // Clear OTP if failed to send
      await supabaseAdmin
        .from("members")
        .update({
          tac_code: null,
          tac_expiry: null,
        })
        .eq("id", member.id);
      
      return res.status(response.status).json({
        success: false,
        error: responseData.reason || "Failed to send WhatsApp message",
      });
    }

    console.log("✅ WhatsApp TAC sent successfully");

    return res.status(200).json({
      success: true,
      message: "WhatsApp TAC sent successfully",
      data: {
        messageId: responseData.id || responseData.message_id,
        status: "sent",
      },
    });

  } catch (error) {
    console.error("\n=== ERROR ===");
    console.error("Error:", error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}