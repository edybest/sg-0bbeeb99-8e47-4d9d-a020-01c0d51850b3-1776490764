import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type MemberSession = Database["public"]["Tables"]["member_sessions"]["Row"];

/**
 * Session Service - Handles all session-related operations
 */
export const sessionService = {
  /**
   * Get current session from cookie
   */
  async getCurrentSession(): Promise<MemberSession | null> {
    try {
      const sessionToken = this.getSessionTokenFromCookie();
      if (!sessionToken) return null;

      const { data, error } = await supabase
        .from("member_sessions")
        .select("*")
        .eq("session_token", sessionToken)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (error || !data) return null;

      // Update last accessed time
      await supabase
        .from("member_sessions")
        .update({ last_accessed_at: new Date().toISOString() })
        .eq("id", data.id);

      return data;
    } catch (error) {
      console.error("Error getting current session:", error);
      return null;
    }
  },

  /**
   * Get session token from cookie
   */
  getSessionTokenFromCookie(): string | null {
    if (typeof document === "undefined") return null;
    
    const cookies = document.cookie.split(";");
    const sessionCookie = cookies.find(c => c.trim().startsWith("ambc_session="));
    
    if (!sessionCookie) return null;
    
    return sessionCookie.split("=")[1];
  },

  /**
   * Set session cookie
   */
  setSessionCookie(sessionToken: string, expiresAt: string) {
    if (typeof document === "undefined") return;
    
    const expiryDate = new Date(expiresAt);
    document.cookie = `ambc_session=${sessionToken}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax; Secure`;
  },

  /**
   * Clear session cookie
   */
  clearSessionCookie() {
    if (typeof document === "undefined") return;
    
    document.cookie = "ambc_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  },

  /**
   * Logout - clear session
   */
  async logout(): Promise<void> {
    try {
      const sessionToken = this.getSessionTokenFromCookie();
      
      if (sessionToken) {
        // Delete session from database
        await supabase
          .from("member_sessions")
          .delete()
          .eq("session_token", sessionToken);
      }

      // Clear cookie
      this.clearSessionCookie();
    } catch (error) {
      console.error("Error during logout:", error);
      // Always clear cookie even if DB delete fails
      this.clearSessionCookie();
    }
  }
};