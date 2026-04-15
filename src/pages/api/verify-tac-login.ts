import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_SERVICE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
    console.log("🔐 Verifying TAC for:", phone_number);

    // 1. Find valid TAC - Use correct column names from schema
    const now = new Date().toISOString();
    const { data: tacRecords, error: tacError } = await supabase
      .from("whatsapp_tac")
      .select("*")
      .eq("phone_number", phone_number)
      .eq("tac", tac)
      .eq("used", false)
      .gt("expires_at", now)
      .order("created_at", { ascending: false });

    if (tacError) {
      console.error("TAC query error:", tacError);
      return res.status(500).json({ 
        error: "Ralat pangkalan data semasa mengesahkan TAC",
        details: tacError.message 
      });
    }

    if (!tacRecords || tacRecords.length === 0) {
      console.log("❌ Invalid or expired TAC");
      return res.status(401).json({ 
        error: "Kod TAC tidak sah atau telah tamat tempoh" 
      });
    }

    const tacRecord = tacRecords[0];
    console.log("✅ Valid TAC found, member_id:", tacRecord.member_id);

    // 2. Get member details using member_id from TAC record
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, user_id, full_name, is_admin, is_approved")
      .eq("id", tacRecord.member_id)
      .single();

    if (memberError || !member) {
      console.error("Member query error:", memberError);
      return res.status(404).json({ 
        error: "Ahli tidak dijumpai" 
      });
    }

    // 3. Check if member is approved
    if (!member.is_approved) {
      console.log("❌ Member not approved");
      return res.status(403).json({ 
        error: "Akaun anda belum diluluskan oleh admin" 
      });
    }

    console.log("✅ Member approved, generating token...");

    // 4. Generate login token using the API
    const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/generate-login-token`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ memberId: member.id }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Token generation error:", errorData);
      return res.status(500).json({ 
        error: "Ralat mencipta token log masuk" 
      });
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.success || !tokenData.token) {
      console.error("Invalid token response:", tokenData);
      return res.status(500).json({ 
        error: "Ralat mencipta token log masuk" 
      });
    }

    // 5. Mark TAC as used (non-blocking)
    supabase
      .from("whatsapp_tac")
      .update({ used: true })
      .eq("id", tacRecord.id)
      .then(() => console.log("✅ TAC marked as used"))
      .catch((err) => console.error("Failed to mark TAC as used:", err));

    console.log("✅ Login successful for member:", member.full_name);

    // 6. Return success with auth token
    return res.status(200).json({
      success: true,
      auth_token: tokenData.token,
      member: {
        id: member.id,
        full_name: member.full_name,
        is_admin: member.is_admin,
      },
    });

  } catch (error: any) {
    console.error("❌ Verify TAC error:", error);
    return res.status(500).json({ 
      error: "Ralat sistem. Sila cuba lagi atau hubungi admin.",
      details: error.message
    });
  }
}