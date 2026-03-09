import { supabase } from "@/integrations/supabase/client";

export const sessionService = {
  /**
   * Set session context in database for current request
   * Must be called before any RLS-protected queries
   */
  async setSessionContext(sessionToken: string): Promise<void> {
    try {
      const { error } = await supabase.rpc("set_session_context", {
        session_token: sessionToken
      });

      if (error) {
        console.error("Failed to set session context:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error setting session context:", error);
      throw error;
    }
  },

  /**
   * Get session token from cookie
   */
  getSessionTokenFromCookie(): string | null {
    if (typeof document === "undefined") return null;
    
    const cookies = document.cookie.split(";");
    const sessionCookie = cookies.find(c => c.trim().startsWith("session_token="));
    
    if (!sessionCookie) return null;
    
    return sessionCookie.split("=")[1];
  },

  /**
   * Initialize session context automatically
   * Call this before making any database queries
   */
  async initializeSessionContext(): Promise<boolean> {
    const sessionToken = this.getSessionTokenFromCookie();
    
    if (!sessionToken) {
      console.warn("No session token found in cookie");
      return false;
    }

    try {
      await this.setSessionContext(sessionToken);
      return true;
    } catch (error) {
      console.error("Failed to initialize session context:", error);
      return false;
    }
  },

  /**
   * Clear session cookie (for logout)
   */
  clearSessionCookie(): void {
    if (typeof document === "undefined") return;
    document.cookie = "session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
};