import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type PageAccess = Tables<"page_access">;

export const pageAccessService = {
  /**
   * Pages that can be accessed without login
   */
  publicPages: [
    "/",
    "/login",
    "/signup",
    "/member",           // Member dashboard - PUBLIC
    "/member/blok",      // Blok page - PUBLIC
    "/member/couple",    // Couple page - PUBLIC
    "/member/average-score", // Average score - PUBLIC
    "/member/mini-blok", // Mini blok - PUBLIC
  ],

  /**
   * Check if a page can be accessed without authentication
   */
  isPublicPage(path: string): boolean {
    return this.publicPages.includes(path);
  },

  /**
   * Get page access settings for a specific member
   */
  async getMemberPageAccess(memberId: string): Promise<PageAccess[]> {
    const { data, error } = await supabase
      .from("page_access")
      .select("*")
      .eq("member_id", memberId);

    if (error) {
      console.error("Error fetching page access:", error);
      return [];
    }

    return data || [];
  },

  /**
   * Get all page access records (admin only)
   */
  async getAllPageAccess(): Promise<PageAccess[]> {
    const { data, error } = await supabase
      .from("page_access")
      .select(`
        *,
        profiles!inner(full_name, phone_number)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all page access:", error);
      return [];
    }

    return data || [];
  },

  /**
   * Update page access for a member
   */
  async updatePageAccess(
    memberId: string,
    updates: Partial<Omit<PageAccess, "id" | "member_id" | "created_at" | "updated_at">>
  ): Promise<boolean> {
    // Check if record exists
    const { data: existing } = await supabase
      .from("page_access")
      .select("id")
      .eq("member_id", memberId)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from("page_access")
        .update(updates)
        .eq("member_id", memberId);

      if (error) {
        console.error("Error updating page access:", error);
        return false;
      }
    } else {
      // Create new record
      const { error } = await supabase
        .from("page_access")
        .insert({
          member_id: memberId,
          ...updates,
        });

      if (error) {
        console.error("Error creating page access:", error);
        return false;
      }
    }

    return true;
  },

  /**
   * Check if member has access to a specific page
   */
  async hasPageAccess(memberId: string, pagePath: string): Promise<boolean> {
    // Public pages are always accessible
    if (this.isPublicPage(pagePath)) {
      return true;
    }

    // Map page paths to database columns
    const pageColumnMap: Record<string, keyof PageAccess> = {
      "/member/chat": "can_access_chat",
      "/member/gallery": "can_access_gallery",
      "/member/profile": "can_access_profile",
      "/member/training": "can_access_training",
      "/member/five-five": "can_access_five_five",
      "/member/hall-of-fame": "can_access_hall_of_fame",
      "/member/lane": "can_access_lane",
      "/member/undi-lane": "can_access_undi_lane",
      "/member/feedback": "can_access_feedback",
    };

    const column = pageColumnMap[pagePath];
    if (!column) {
      // If page is not in the map, allow access by default
      return true;
    }

    const { data, error } = await supabase
      .from("page_access")
      .select(column)
      .eq("member_id", memberId)
      .maybeSingle();

    if (error) {
      console.error("Error checking page access:", error);
      return false;
    }

    // If no record exists, deny access
    if (!data) {
      return false;
    }

    return data[column] === true;
  },

  /**
   * Get pages accessible by a member
   */
  async getAccessiblePages(memberId: string): Promise<string[]> {
    const accessiblePages = [...this.publicPages];

    const pageAccess = await this.getMemberPageAccess(memberId);
    if (pageAccess.length === 0) {
      return accessiblePages;
    }

    const access = pageAccess[0];

    if (access.can_access_chat) accessiblePages.push("/member/chat");
    if (access.can_access_gallery) accessiblePages.push("/member/gallery");
    if (access.can_access_profile) accessiblePages.push("/member/profile");
    if (access.can_access_training) accessiblePages.push("/member/training");
    if (access.can_access_five_five) accessiblePages.push("/member/five-five");
    if (access.can_access_hall_of_fame) accessiblePages.push("/member/hall-of-fame");
    if (access.can_access_lane) accessiblePages.push("/member/lane");
    if (access.can_access_undi_lane) accessiblePages.push("/member/undi-lane");
    if (access.can_access_feedback) accessiblePages.push("/member/feedback");

    return accessiblePages;
  },
};