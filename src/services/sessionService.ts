/**
 * Session Service - DEPRECATED
 * This file is kept for backwards compatibility but is no longer used.
 * We now use native Supabase Auth session management instead of custom sessions.
 * 
 * All authentication now flows through:
 * - Admin: supabase.auth.signInWithPassword (email/password)
 * - Member: supabase.auth.signInWithOtp (phone/WhatsApp)
 * 
 * RLS policies use auth.uid() directly - no custom session context needed.
 */

export const sessionService = {
  /**
   * @deprecated No longer needed - Supabase Auth handles sessions automatically
   */
  async initializeSessionContext(): Promise<void> {
    console.warn("sessionService.initializeSessionContext() is deprecated - using native Supabase Auth");
    return;
  },

  /**
   * @deprecated No longer needed - use supabase.auth.getSession() instead
   */
  async getSession(): Promise<any> {
    console.warn("sessionService.getSession() is deprecated - use supabase.auth.getSession()");
    return null;
  },
};