import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_SERVICE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
    console.log("🔐 Verifying TAC for:", phone_number);

    // 1. Find valid TAC (single query with filters)
    const { data: tacRecord, error: tacError } = await supabase
      .from("whatsapp_tac")
      .select("id, phone_number, member_id, expires_at")
      .eq("phone_number", phone_number)
      .eq("tac", tac)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tacError) {
      console.error("TAC query error:", tacError);
      return res.status(500).json({ 
        error: "Ralat pangkalan data semasa mengesahkan TAC" 
      });
    }

    if (!tacRecord) {
      console.log("❌ Invalid or expired TAC");
      return res.status(401).json({ 
        error: "Kod TAC tidak sah atau telah tamat tempoh" 
      });
    }

    console.log("✅ Valid TAC found, member_id:", tacRecord.member_id);

    // 2. Get member details (single query)
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

    console.log("✅ Member approved, generating session...");

    // 4. Create admin client for session management
    const { createClient } = await import("@supabase/supabase-js");
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      ADMIN_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 5. Generate auth token for the user
    const { data: sessionData, error: sessionError } = await adminClient.auth.admin.createUser({
      email: `${member.user_id}@ambc.temp`,
      email_confirm: true,
      user_metadata: {
        member_id: member.id,
        full_name: member.full_name,
        is_admin: member.is_admin,
      },
    });

    if (sessionError) {
      console.error("Session creation error:", sessionError);
      return res.status(500).json({ 
        error: "Ralat mencipta sesi" 
      });
    }

    // 6. Mark TAC as used (fire and forget - don't wait)
    supabase
      .from("whatsapp_tac")
      .update({ used: true })
      .eq("id", tacRecord.id)
      .then(() => console.log("✅ TAC marked as used"))
      .catch((err) => console.error("Failed to mark TAC as used:", err));

    console.log("✅ Login successful for member:", member.full_name);

    // 7. Return success with auth token
    return res.status(200).json({
      success: true,
      auth_token: sessionData.session?.access_token || "",
      member: {
        id: member.id,
        full_name: member.full_name,
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