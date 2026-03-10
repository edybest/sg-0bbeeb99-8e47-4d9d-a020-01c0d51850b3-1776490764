import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PageAccess = Database["public"]["Tables"]["page_access_control"]["Row"];
type PageAccessInsert = Database["public"]["Tables"]["page_access_control"]["Insert"];
type PageAccessUpdate = Database["public"]["Tables"]["page_access_control"]["Update"];

export type AccessLevel = "public" | "member" | "admin";

// Simple in-memory cache to reduce database calls
const cache: {
  userRole?: "guest" | "member" | "admin";
  userRoleTimestamp?: number;
  pageAccess: Map<string, { data: PageAccess | null; timestamp: number }>;
} = {
  pageAccess: new Map(),
};

const CACHE_DURATION = 60000; // 1 minute

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

  // Get access level for specific page (with caching)
  async getPageAccess(pagePath: string): Promise<PageAccess | null> {
    // Check cache first
    const cached = cache.pageAccess.get(pagePath);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const { data, error } = await supabase
      .from("page_access_control")
      .select("*")
      .eq("page_path", pagePath)
      .maybeSingle();

    if (error) {
      console.error("Error fetching page access:", error);
      return null;
    }

    // Cache the result
    cache.pageAccess.set(pagePath, {
      data,
      timestamp: Date.now(),
    });

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

    // Clear cache for this page
    const pagePath = data.page_path;
    cache.pageAccess.delete(pagePath);

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

  // Get user role from session (with caching)
  async getUserRole(): Promise<"guest" | "member" | "admin"> {
    // Check cache first
    if (
      cache.userRole &&
      cache.userRoleTimestamp &&
      Date.now() - cache.userRoleTimestamp < CACHE_DURATION
    ) {
      return cache.userRole;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        cache.userRole = "guest";
        cache.userRoleTimestamp = Date.now();
        return "guest";
      }

      // Check if admin
      const { data: memberData } = await supabase
        .from("members")
        .select("is_admin")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const role = memberData?.is_admin ? "admin" : "member";
      
      // Cache the result
      cache.userRole = role;
      cache.userRoleTimestamp = Date.now();

      return role;
    } catch (error) {
      console.error("Error getting user role:", error);
      return "guest";
    }
  },

  // Clear cache (useful after login/logout)
  clearCache() {
    cache.userRole = undefined;
    cache.userRoleTimestamp = undefined;
    cache.pageAccess.clear();
  },
};