import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { whatsappService } from "./whatsappService";

type Member = Tables<"members">;

/**
 * Session cache to reduce concurrent auth checks
 */
let sessionCache: { session: any; timestamp: number } | null = null;
const SESSION_CACHE_DURATION = 2000; // 2 seconds cache

/**
 * Get dynamic redirect URL based on environment
 */
const getRedirectUrl = () => {
  if (typeof window === "undefined") return "";
  return window.location.origin;
};

export const authService = {
  /**
   * Member signup with email verification
   */
  signUp: async (email: string, password: string, userData: Partial<Member>) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getRedirectUrl(),
          data: userData,
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      // Handle rate limit errors gracefully
      if (error.message?.includes("rate limit") || error.message?.includes("Email rate limit exceeded")) {
        return {
          data: null,
          error: {
            message: "⚠️ Email rate limit exceeded. Akaun akan dibuat tanpa email verification. Sila hubungi admin atau login dengan username untuk bypass.",
            code: "RATE_LIMIT_EXCEEDED"
          }
        };
      }
      return { data: null, error };
    }
  },

  /**
   * Request OTP for login (email/phone)
   */
  requestOTP: async (identifier: string) => {
    try {
      // Check if identifier is email
      const isEmail = identifier.includes("@");
      
      if (isEmail) {
        const { data, error } = await supabase.auth.signInWithOtp({
          email: identifier,
          options: {
            emailRedirectTo: getRedirectUrl(),
          },
        });
        
        if (error) throw error;
        return { data, error: null };
      } else {
        // For phone/username, we need to get email first from members table
        const { data: member, error: memberError } = await supabase
          .from("members")
          .select("email, phone")
          .or(`username.eq.${identifier},phone.eq.${identifier}`)
          .single();

        if (memberError || !member?.email) {
          return {
            data: null,
            error: { message: "Member tidak dijumpai atau tiada email berdaftar." }
          };
        }

        const { data, error } = await supabase.auth.signInWithOtp({
          email: member.email,
          options: {
            emailRedirectTo: getRedirectUrl(),
          },
        });

        if (error) throw error;
        return { data, error: null };
      }
    } catch (error: any) {
      // Handle rate limit errors gracefully
      if (error.message?.includes("rate limit") || error.message?.includes("Email rate limit exceeded")) {
        return {
          data: null,
          error: {
            message: "⚠️ Email rate limit exceeded. Sila tunggu 1 jam atau gunakan 'Development Bypass' untuk login tanpa OTP.",
            code: "RATE_LIMIT_EXCEEDED"
          }
        };
      }
      return { data: null, error };
    }
  },

  /**
   * Verify OTP code
   */
  verifyOTP: async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) return { data: null, error };
    return { data, error: null };
  },

  /**
   * Admin/Superuser login with email + password
   */
  signInWithPassword: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { data: null, error };

    // Check if user is admin
    const { data: member } = await supabase
      .from("members")
      .select("is_admin, is_verified")
      .eq("email", email)
      .single();

    if (!member?.is_admin) {
      await supabase.auth.signOut();
      return {
        data: null,
        error: { message: "Access denied. Admin privileges required." },
      };
    }

    return { data, error: null };
  },

  /**
   * 🆕 BYPASS: Admin manually verify member (skip OTP)
   */
  adminVerifyMember: async (memberId: string) => {
    try {
      // Update member as verified
      const { error } = await supabase
        .from("members")
        .update({ is_verified: true })
        .eq("id", memberId);

      if (error) throw error;
      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error };
    }
  },

  /**
   * 🆕 Send WhatsApp TAC code for login
   */
  sendWhatsAppTAC: async (identifier: string) => {
    try {
      // Find member by username, email, or phone
      const { data: member, error: fetchError } = await supabase
        .from("members")
        .select("id, username, email, phone, full_name")
        .or(`username.eq.${identifier},email.eq.${identifier},phone.eq.${identifier}`)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching member:", fetchError);
        return { error: "Ralat sistem. Sila cuba lagi." };
      }

      if (!member) {
        return { error: "Username, email atau nombor telefon tidak dijumpai." };
      }

      // Check if member has phone number
      if (!member.phone) {
        return {
          data: null,
          error: { message: "❌ Ahli tidak mempunyai nombor telefon. Sila hubungi admin untuk update." }
        };
      }

      // Generate TAC code
      const tacCode = whatsappService.generateTACCode();

      // Store TAC in database
      await whatsappService.storeTACCode(member.id, tacCode);

      // Send via WhatsApp
      await whatsappService.sendWhatsAppTAC(member.phone, tacCode, member.username);

      return {
        data: { 
          memberId: member.id,
          phone: member.phone,
          username: member.username,
        },
        error: null,
        message: "✅ Kod TAC telah dihantar ke WhatsApp anda!"
      };
    } catch (error: any) {
      console.error("Send WhatsApp TAC error:", error);
      return { 
        data: null, 
        error: { message: error.message || "❌ Gagal menghantar kod TAC. Sila cuba lagi." }
      };
    }
  },

  /**
   * 🆕 Verify WhatsApp TAC and login
   * FIXED: Properly verify custom TAC code and establish session
   */
  verifyWhatsAppTAC: async (memberId: string, tacCode: string) => {
    try {
      console.log("=== VERIFY WHATSAPP TAC START ===");
      console.log("Member ID:", memberId);
      console.log("TAC Code:", tacCode);

      // Step 1: Verify TAC code in database
      console.log("Step 1: Checking TAC in database...");
      const { data: tacRecord, error: tacError } = await (supabase as any)
        .from("whatsapp_tac_codes")
        .select("*")
        .eq("member_id", memberId)
        .eq("code", tacCode)
        .eq("is_used", false)
        .gte("expires_at", new Date().toISOString())
        .maybeSingle();

      if (tacError) {
        console.error("❌ TAC lookup error:", tacError);
        return { 
          data: null, 
          error: { message: "Database error: " + tacError.message }
        };
      }

      if (!tacRecord) {
        console.log("❌ TAC not found or invalid");
        console.log("Checking for any TAC codes for this member:");
        const { data: allTacs } = await (supabase as any)
          .from("whatsapp_tac_codes")
          .select("*")
          .eq("member_id", memberId)
          .order("created_at", { ascending: false })
          .limit(3);
        
        console.log("Recent TAC codes:", allTacs);
        
        return { 
          data: null, 
          error: { message: "❌ Kod TAC tidak dijumpai. Sila minta kod baru." }
        };
      }

      console.log("✅ TAC verified in database:", tacRecord.id);

      // Step 2: Mark TAC as used
      console.log("Step 2: Marking TAC as used...");
      const { error: updateError } = await (supabase as any)
        .from("whatsapp_tac_codes")
        .update({ 
          is_used: true, 
          used_at: new Date().toISOString() 
        })
        .eq("id", tacRecord.id);

      if (updateError) {
        console.error("⚠️ Warning: Could not mark TAC as used:", updateError);
      } else {
        console.log("✅ TAC marked as used");
      }

      // Step 3: Get member data
      console.log("Step 3: Getting member data...");
      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("*")
        .eq("id", memberId)
        .single();

      if (memberError || !member) {
        console.error("❌ Member not found:", memberError);
        return {
          data: null,
          error: { message: "Member tidak dijumpai" }
        };
      }

      if (!member.email) {
        console.error("❌ Member has no email");
        return {
          data: null,
          error: { message: "Member tidak mempunyai email. Sila hubungi admin." }
        };
      }

      console.log("✅ Member found:", member.email);

      // Step 4: Generate magic link token via backend
      console.log("Step 4: Generating magic link token via API...");
      const tokenResponse = await fetch("/api/generate-login-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error("❌ Token generation failed:", errorData);
        throw new Error(errorData.error || "Failed to generate login token");
      }

      const tokenData = await tokenResponse.json();
      console.log("✅ Magic link token generated");
      console.log("- Email:", tokenData.email);
      console.log("- Has token_hash:", !!tokenData.token_hash);

      if (!tokenData.token_hash) {
        console.error("❌ No token_hash in response");
        throw new Error("Token hash tidak dijumpai");
      }

      // Step 5: Verify OTP with token_hash to establish session
      console.log("Step 5: Establishing session with verifyOtp...");
      const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
        email: tokenData.email,
        token_hash: tokenData.token_hash,
        type: "magiclink",
      });

      if (verifyError) {
        console.error("❌ Session establishment error:", verifyError);
        throw verifyError;
      }

      if (!sessionData?.session) {
        console.error("❌ No session in response");
        throw new Error("Session tidak dapat diwujudkan");
      }

      console.log("✅ Session established successfully!");
      console.log("- User ID:", sessionData.session.user.id);
      console.log("- Access token:", sessionData.session.access_token ? "EXISTS" : "NULL");
      console.log("- Expires at:", sessionData.session.expires_at);
      console.log("=== VERIFY WHATSAPP TAC END ===");

      return {
        data: { member, session: sessionData.session },
        error: null,
        message: "✅ Login berjaya!",
      };
    } catch (error: any) {
      console.error("❌ Verify WhatsApp TAC error:", error);
      return { 
        data: null, 
        error: { message: error.message || "❌ Gagal verify kod TAC. Sila cuba lagi." }
      };
    }
  },

  /**
   * 🆕 BYPASS: Development mode - Auto-verify member without OTP
   * USE CASE: Rate limit exceeded, testing, or email delivery issues
   */
  devBypassLogin: async (identifier: string) => {
    try {
      // Get member data
      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("*")
        .or(`username.eq.${identifier},email.eq.${identifier},phone.eq.${identifier}`)
        .maybeSingle();

      if (memberError || !member) {
        return {
          data: null,
          error: { message: "❌ Member tidak dijumpai. Sila check username/email atau daftar akaun baru." }
        };
      }

      // Check if member has email
      if (!member.email) {
        return {
          data: null,
          error: { message: "❌ Member tiada email dalam rekod. Sila hubungi admin untuk update email." }
        };
      }

      // Auto-verify member if not verified yet
      if (!member.is_verified) {
        const { error: updateError } = await supabase
          .from("members")
          .update({ 
            is_verified: true,
            updated_at: new Date().toISOString()
          })
          .eq("id", member.id);

        if (updateError) {
          console.error("Auto-verify error:", updateError);
        }
      }

      return {
        data: { member },
        error: null,
        message: `✅ Member verified! Username: ${member.username}, Email: ${member.email}. Sila login menggunakan email/password atau hubungi admin.`
      };
    } catch (error: any) {
      console.error("Dev bypass error:", error);
      return { 
        data: null, 
        error: { message: error.message || "❌ Bypass login gagal. Sila cuba lagi atau hubungi admin." }
      };
    }
  },

  /**
   * Get current session
   * Optimized with caching to reduce lock contention
   */
  getSession: async () => {
    try {
      // Check cache first
      const now = Date.now();
      if (sessionCache && (now - sessionCache.timestamp) < SESSION_CACHE_DURATION) {
        return { data: sessionCache.session, error: null };
      }

      // Get fresh session with retry mechanism
      let retries = 3;
      let lastError = null;

      while (retries > 0) {
        try {
          const { data, error } = await supabase.auth.getSession();
          
          if (!error) {
            // Update cache
            sessionCache = {
              session: data.session,
              timestamp: now
            };
            return { data: data.session, error: null };
          }
          
          lastError = error;
          retries--;
          
          // Wait before retry (exponential backoff)
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 100 * (4 - retries)));
          }
        } catch (err: any) {
          lastError = err;
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 100 * (4 - retries)));
          }
        }
      }

      return { data: null, error: lastError };
    } catch (error: any) {
      console.error("getSession error:", error);
      return { data: null, error };
    }
  },

  /**
   * Sign out
   */
  signOut: async () => {
    // Clear session cache
    sessionCache = null;
    
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Get current user profile from members table
   */
  getCurrentMember: async () => {
    try {
      // Use optimized getSession
      const { data: session, error: sessionError } = await authService.getSession();
      
      if (sessionError || !session?.user) {
        return { data: null, error: { message: "Not authenticated" } };
      }

      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("email", session.user.email)
        .single();

      return { data, error };
    } catch (error: any) {
      console.error("getCurrentMember error:", error);
      return { data: null, error };
    }
  },
};