import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Member = Database["public"]["Tables"]["members"]["Row"];

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: any;
  created_at?: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

// Dynamic URL Helper
const getURL = () => {
  let url = process?.env?.NEXT_PUBLIC_VERCEL_URL ?? 
           process?.env?.NEXT_PUBLIC_SITE_URL ?? 
           'http://localhost:3000'
  
  // Handle undefined or null url
  if (!url) {
    url = 'http://localhost:3000';
  }
  
  // Ensure url has protocol
  url = url.startsWith('http') ? url : `https://${url}`
  
  // Ensure url ends with slash
  url = url.endsWith('/') ? url : `${url}/`
  
  return url
}

export const authService = {
  // Refresh session (called automatically by Supabase, but exposed for manual refresh)
  async refreshSession(): Promise<{ session: Session | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        return { session: null, error: { message: error.message } };
      }

      return { session: data.session, error: null };
    } catch (error) {
      return { 
        session: null, 
        error: { message: "An unexpected error occurred during session refresh" } 
      };
    }
  },

  // Get current user
  getCurrentUser: async (): Promise<Member | null> => {
    try {
      // Get session with extended timeout for long-lived sessions
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => {
        setTimeout(() => resolve({ data: { session: null } }), 2000);
      });

      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

      if (!session?.user) {
        return null;
      }

      // Auto-refresh if session is close to expiry (within 6 hours)
      // This ensures session always stays fresh
      if (session.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000);
        const now = new Date();
        const sixHours = 6 * 60 * 60 * 1000;
        
        if (expiresAt.getTime() - now.getTime() < sixHours) {
          console.log("Session will expire soon, refreshing preemptively...");
          await authService.refreshSession();
        }
      }

      // Get member data
      const { data: member, error } = await supabase
        .from("members")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching member:", error);
        return null;
      }

      return member;
    } catch (error) {
      console.error("Error in getCurrentUser:", error);
      return null;
    }
  },

  // Get current session
  async getCurrentSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Sign up with email and password
  async signUp(email: string, password: string): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${getURL()}auth/confirm-email`
        }
      });

      if (error) {
        return { user: null, error: { message: error.message, code: error.status?.toString() } };
      }

      const authUser = data.user ? {
        id: data.user.id,
        email: data.user.email || "",
        user_metadata: data.user.user_metadata,
        created_at: data.user.created_at
      } : null;

      return { user: authUser, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: { message: "An unexpected error occurred during sign up" } 
      };
    }
  },

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: { message: error.message, code: error.status?.toString() } };
      }

      const authUser = data.user ? {
        id: data.user.id,
        email: data.user.email || "",
        user_metadata: data.user.user_metadata,
        created_at: data.user.created_at
      } : null;

      return { user: authUser, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: { message: "An unexpected error occurred during sign in" } 
      };
    }
  },

  // Sign out
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch (error) {
      return { 
        error: { message: "An unexpected error occurred during sign out" } 
      };
    }
  },

  // Reset password
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getURL()}auth/reset-password`,
      });

      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch (error) {
      return { 
        error: { message: "An unexpected error occurred during password reset" } 
      };
    }
  },

  // Confirm email (REQUIRED)
  async confirmEmail(token: string, type: 'signup' | 'recovery' | 'email_change' = 'signup'): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type
      });

      if (error) {
        return { user: null, error: { message: error.message, code: error.status?.toString() } };
      }

      const authUser = data.user ? {
        id: data.user.id,
        email: data.user.email || "",
        user_metadata: data.user.user_metadata,
        created_at: data.user.created_at
      } : null;

      return { user: authUser, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: { message: "An unexpected error occurred during email confirmation" } 
      };
    }
  },

  // Admin verify member manually
  async adminVerifyMember(memberId: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase
        .from('members')
        .update({ is_verified: true })
        .eq('id', memberId);

      if (error) {
        return { error: { message: error.message, code: error.code } };
      }
      return { error: null };
    } catch (error) {
      return { error: { message: "An unexpected error occurred during admin verification" } };
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },

  // Admin login as member (impersonation)
  async adminLoginAsMember(memberId: string): Promise<{ success: boolean; error: AuthError | null }> {
    try {
      // Get current admin session first
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      
      if (!adminSession) {
        return { success: false, error: { message: "No admin session found" } };
      }

      // Store admin session ID in localStorage so we can restore it later
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_impersonation_session', JSON.stringify({
          adminUserId: adminSession.user.id,
          adminEmail: adminSession.user.email,
          timestamp: Date.now()
        }));
      }

      // Generate a login token for the member via API
      const response = await fetch('/api/generate-login-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate login token');
      }

      const { token } = await response.json();

      // Sign out current admin session
      await supabase.auth.signOut();

      // Sign in as the member using the token
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });

      if (error) {
        return { success: false, error: { message: error.message } };
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error in adminLoginAsMember:', error);
      return { success: false, error: { message: error.message || 'Failed to login as member' } };
    }
  },

  // Return to admin account after impersonation
  async returnToAdminAccount(): Promise<{ success: boolean; error: AuthError | null }> {
    try {
      if (typeof window === 'undefined') {
        return { success: false, error: { message: 'Not in browser environment' } };
      }

      const impersonationData = localStorage.getItem('admin_impersonation_session');
      
      if (!impersonationData) {
        return { success: false, error: { message: 'No impersonation session found' } };
      }

      const { adminUserId } = JSON.parse(impersonationData);

      // Sign out current member session
      await supabase.auth.signOut();

      // Generate login token for admin
      const response = await fetch('/api/generate-login-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: adminUserId })
      });

      if (!response.ok) {
        throw new Error('Failed to restore admin session');
      }

      const { token } = await response.json();

      // Sign in as admin using the token
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });

      if (error) {
        return { success: false, error: { message: error.message } };
      }

      // Clear impersonation data
      localStorage.removeItem('admin_impersonation_session');

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error returning to admin account:', error);
      return { success: false, error: { message: error.message || 'Failed to return to admin account' } };
    }
  }
};
