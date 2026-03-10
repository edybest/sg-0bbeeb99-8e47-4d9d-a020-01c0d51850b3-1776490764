import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PageAccess = Database["public"]["Tables"]["page_access_control"]["Row"];
type PageAccessInsert = Database["public"]["Tables"]["page_access_control"]["Insert"];
type PageAccessUpdate = Database["public"]["Tables"]["page_access_control"]["Update"];

export type AccessLevel = "public" | "member" | "admin";

export const pageAccessService = {
  // Get all page access settings
  async getAllPageAccess(): Promise<PageAccess[]> {
    const { data, error } = await supabase
      .from("page_access_control")
      .select("*")
      .order("page_path");

    if (error) {
      console.error("Error fetching page access:", error);
      throw error;
    }

    return data || [];
  },

  // Get access level for specific page
  async getPageAccess(pagePath: string): Promise<PageAccess | null> {
    const { data, error } = await supabase
      .from("page_access_control")
      .select("*")
      .eq("page_path", pagePath)
      .single();

    if (error) {
      console.error("Error fetching page access:", error);
      return null;
    }

    return data;
  },

  // Update page access level
  async updatePageAccess(
    id: string,
    updates: PageAccessUpdate
  ): Promise<PageAccess> {
    const { data, error } = await supabase
      .from("page_access_control")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating page access:", error);
      throw error;
    }

    return data;
  },

  // Toggle page enabled/disabled
  async togglePageEnabled(id: string, isEnabled: boolean): Promise<PageAccess> {
    return this.updatePageAccess(id, { is_enabled: isEnabled });
  },

  // Check if user has access to page
  async checkPageAccess(
    pagePath: string,
    userRole: "guest" | "member" | "admin"
  ): Promise<{ hasAccess: boolean; accessLevel: AccessLevel; isEnabled: boolean }> {
    const pageAccess = await this.getPageAccess(pagePath);

    // If page not in database, default to public access
    if (!pageAccess) {
      return { hasAccess: true, accessLevel: "public", isEnabled: true };
    }

    // If page is disabled, no access for anyone
    if (!pageAccess.is_enabled) {
      return { hasAccess: false, accessLevel: pageAccess.access_level, isEnabled: false };
    }

    // Check access based on level
    const accessLevel = pageAccess.access_level;
    let hasAccess = false;

    switch (accessLevel) {
      case "public":
        hasAccess = true; // Everyone can access
        break;
      case "member":
        hasAccess = userRole === "member" || userRole === "admin";
        break;
      case "admin":
        hasAccess = userRole === "admin";
        break;
      default:
        hasAccess = false;
    }

    return { hasAccess, accessLevel, isEnabled: pageAccess.is_enabled };
  },

  // Get user role from session
  async getUserRole(): Promise<"guest" | "member" | "admin"> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return "guest";
    }

    // Check if admin
    const { data: memberData } = await supabase
      .from("members")
      .select("is_admin")
      .eq("user_id", session.user.id)
      .single();

    if (memberData?.is_admin) {
      return "admin";
    }

    return "member";
  },
};