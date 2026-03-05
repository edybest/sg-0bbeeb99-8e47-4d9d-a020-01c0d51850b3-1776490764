import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Member = Tables<"members">;

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
            message: "Terlalu banyak permintaan. Sila cuba lagi dalam 1 jam atau hubungi admin untuk manual verification.",
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
            message: "Terlalu banyak permintaan OTP. Sila cuba lagi dalam 1 jam atau hubungi admin untuk manual login.",
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
   * 🆕 BYPASS: Development mode - Create session without OTP
   * WARNING: Only use in development/testing!
   */
  devBypassLogin: async (identifier: string) => {
    try {
      // Get member data
      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("*")
        .or(`username.eq.${identifier},email.eq.${identifier},phone.eq.${identifier}`)
        .single();

      if (memberError || !member) {
        return {
          data: null,
          error: { message: "Member tidak dijumpai." }
        };
      }

      // Check if member has email in auth.users
      if (!member.email) {
        return {
          data: null,
          error: { message: "Member tiada email. Sila hubungi admin." }
        };
      }

      // Auto-verify member if not verified
      if (!member.is_verified) {
        await supabase
          .from("members")
          .update({ is_verified: true })
          .eq("id", member.id);
      }

      return {
        data: { member },
        error: null,
        message: "DEV MODE: Member verified. Sila login menggunakan email/password atau hubungi admin untuk set password."
      };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  /**
   * Get current session
   */
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    return { data: data.session, error };
  },

  /**
   * Sign out
   */
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Get current user profile from members table
   */
  getCurrentMember: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: "Not authenticated" } };

    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("email", user.email)
      .single();

    return { data, error };
  },
};
