import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set timeout for this API route
  res.setHeader('X-Vercel-Timeout', '30');

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { phone_number, tac } = req.body;

  if (!phone_number || !tac) {
    return res.status(400).json({ 
      error: "Nombor telefon dan kod TAC diperlukan" 
    });
  }

  try {
    console.log("\n=== VERIFY TAC LOGIN REQUEST ===");
    console.log("Phone number (original):", phone_number);
    console.log("TAC code:", tac);

    // Normalize phone format to match the database
    let cleanPhone = phone_number.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "6" + cleanPhone;
    } else if (!cleanPhone.startsWith("6") && cleanPhone.length > 0) {
      cleanPhone = "60" + cleanPhone;
    }
    if (cleanPhone) {
      cleanPhone = "+" + cleanPhone;
    }

    console.log("Normalized phone for verification:", cleanPhone);
    console.log("\n=== SEARCHING DATABASE ===");

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Find member by phone and valid TAC - try multiple phone formats
    const now = new Date().toISOString();
    
    // Try format 1: +60... (normalized)
    console.log("Try 1: Searching with format:", cleanPhone);
    let { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("id, user_id, full_name, username, is_admin, is_verified, tac_code, tac_expiry")
      .eq("phone", cleanPhone)
      .single();

    // If not found, try format 2: without + prefix (60...)
    if (memberError && cleanPhone.startsWith("+")) {
      const phoneWithoutPlus = cleanPhone.substring(1);
      console.log("Try 2: Searching with format:", phoneWithoutPlus);
      
      const result = await supabaseAdmin
        .from("members")
        .select("id, user_id, full_name, username, is_admin, is_verified, tac_code, tac_expiry")
        .eq("phone", phoneWithoutPlus)
        .single();
      
      member = result.data;
      memberError = result.error;
    }

    // If still not found, try format 3: with leading 0 (0123456789)
    if (memberError && cleanPhone.length > 3) {
      const phoneWithZero = "0" + cleanPhone.substring(3); // +60123... → 0123...
      console.log("Try 3: Searching with format:", phoneWithZero);
      
      const result = await supabaseAdmin
        .from("members")
        .select("id, user_id, full_name, username, is_admin, is_verified, tac_code, tac_expiry")
        .eq("phone", phoneWithZero)
        .single();
      
      member = result.data;
      memberError = result.error;
    }

    if (memberError || !member) {
      console.error("\n=== MEMBER NOT FOUND ===");
      console.error("Database error:", memberError?.message || "No error");
      console.error("Tried formats:", [
        cleanPhone,
        cleanPhone.substring(1),
        "0" + cleanPhone.substring(3)
      ]);
      
      // Get sample phone numbers from database for debugging
      const { data: sampleMembers } = await supabaseAdmin
        .from("members")
        .select("username, phone")
        .not("phone", "is", null)
        .order("created_at", { ascending: false })
        .limit(5);
      
      console.error("Recent phone numbers in database:", sampleMembers?.map(m => m.phone));
      console.error("\n");
      
      return res.status(404).json({ 
        error: "Akaun tidak dijumpai untuk nombor telefon ini. Sila daftar terlebih dahulu atau hubungi admin." 
      });
    }

    console.log("\n=== MEMBER FOUND ===");
    console.log("Member ID:", member.id);
    console.log("Username:", member.username);
    console.log("Has TAC code:", !!member.tac_code);
    console.log("TAC expiry:", member.tac_expiry);

    // 2. Verify TAC code and expiry
    if (!member.tac_code || member.tac_code !== tac) {
      console.log("❌ Invalid TAC code");
      return res.status(401).json({ 
        error: "Kod TAC tidak sah. Sila semak semula." 
      });
    }

    if (!member.tac_expiry || member.tac_expiry < now) {
      console.log("❌ Expired TAC code");
      return res.status(401).json({ 
        error: "Kod TAC telah tamat tempoh. Sila minta kod baru." 
      });
    }

    console.log("✅ Valid TAC found for member:", member.full_name || member.username);

    // 3. Check if member is verified (is_verified column)
    if (!member.is_verified) {
      console.log("❌ Member not verified");
      return res.status(403).json({ 
        error: "Akaun anda belum disahkan. Sila hubungi admin." 
      });
    }

    // 4. Generate Auth Token
    let authToken = "";

    if (member.user_id) {
      console.log("Generating session for existing auth user:", member.user_id);
      
      const { data: memberDetails } = await supabaseAdmin
        .from("members")
        .select("email")
        .eq("id", member.id)
        .single();
        
      // Ensure we have an email to generate the link (fallback to generated email if missing)
      const email = memberDetails?.email || `${member.user_id}@ambc.temp`;

      // We use the admin API to generate a link which provides a session token
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
      });

      if (linkError || !linkData?.properties?.hashed_token) {
        console.error("❌ Failed to generate login link:", linkError);
        return res.status(500).json({ error: "Gagal mencipta sesi log masuk." });
      }
      
      authToken = linkData.properties.hashed_token;
    } else {
      console.error("❌ Member has no linked auth user_id");
      return res.status(500).json({ 
        error: "Akaun belum dikonfigurasi sepenuhnya. Sila hubungi admin." 
      });
    }

    // 5. Clear the used TAC
    const { error: updateError } = await supabaseAdmin
      .from("members")
      .update({ tac_code: null, tac_expiry: null })
      .eq("id", member.id);
      
    if (updateError) {
      console.error("Failed to clear TAC:", updateError);
    } else {
      console.log("✅ TAC cleared from member record");
    }

    console.log("✅ Login successful");

    // 6. Return success with auth token
    return res.status(200).json({
      success: true,
      auth_token: authToken,
      member: {
        id: member.id,
        full_name: member.full_name || member.username,
        is_admin: member.is_admin,
      },
    });

  } catch (error: any) {
    console.error("❌ Verify TAC error:", error);
    return res.status(500).json({ 
      error: "Ralat sistem. Sila cuba lagi atau hubungi admin." 
    });
  }
}