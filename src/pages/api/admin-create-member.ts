import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * Admin API to create member with auth user
 * Creates auth user first, then member record with proper user_id link
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, memberData } = req.body;

    if (!email || !memberData) {
      return res.status(400).json({ error: "Email and member data required" });
    }

    console.log("=== ADMIN CREATE MEMBER ===");
    console.log("Email:", email);
    console.log("Member data:", memberData);
    console.log("Supabase URL:", supabaseUrl);
    console.log("Service key exists:", !!supabaseServiceKey);
    console.log("Service key length:", supabaseServiceKey.length);

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Step 1: Check if user already exists
    console.log("Step 1: Checking if user already exists...");
    const { data: existingUser, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      return res.status(500).json({ 
        error: "Failed to check existing users", 
        details: listError.message 
      });
    }

    const userExists = existingUser?.users?.find((u: any) => u.email === email);

    let userId: string;

    if (userExists) {
      console.log("User already exists:", userExists.id);
      userId = userExists.id;
    } else {
      // Step 2: Create auth user (no password - will use WhatsApp login)
      console.log("Step 2: Creating new auth user...");
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: memberData.full_name,
          phone: memberData.phone,
        },
      });

      if (createUserError || !newUser.user) {
        console.error("Error creating auth user:", createUserError);
        return res.status(500).json({ 
          error: "Failed to create auth user", 
          details: createUserError?.message || "Unknown error"
        });
      }

      userId = newUser.user.id;
      console.log("✅ Auth user created:", userId);
    }

    // Step 3: Create member record with user_id
    console.log("Step 3: Creating member record with user_id:", userId);
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .insert({
        user_id: userId, // ✅ Link to auth user!
        username: memberData.username,
        email: email,
        full_name: memberData.full_name,
        phone: memberData.phone,
        birthday: memberData.birthday,
        sex: memberData.sex,
        bowling_technique: memberData.bowling_technique || null,
        handicap: memberData.handicap || 0,
        avatar_url: memberData.avatar_url || null,
        is_admin: false,
        is_verified: true, // Admin-created members are auto-verified
      })
      .select()
      .single();

    if (memberError) {
      console.error("Error creating member record:", memberError);
      return res.status(500).json({ 
        error: "Failed to create member record", 
        details: memberError.message 
      });
    }

    console.log("✅ Member created successfully:", member.id);

    return res.status(200).json({
      success: true,
      data: {
        userId: userId,
        memberId: member.id,
        member: member,
      },
    });
  } catch (error: any) {
    console.error("Admin create member error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error.message 
    });
  }
}