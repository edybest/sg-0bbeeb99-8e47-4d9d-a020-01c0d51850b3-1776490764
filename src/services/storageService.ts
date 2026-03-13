import { supabase } from "@/integrations/supabase/client";

/**
 * Get cache control setting from database
 * @returns Cache duration in seconds, or "0" if disabled
 */
async function getCacheControl(): Promise<string> {
  try {
    // Check if cache is enabled
    const { data: enableData } = await supabase
      .from("club_settings")
      .select("setting_value")
      .eq("setting_key", "enable_cache")
      .single();

    if (enableData?.setting_value !== "true") {
      return "0"; // Cache disabled
    }

    // Get cache duration
    const { data: durationData } = await supabase
      .from("club_settings")
      .select("setting_value")
      .eq("setting_key", "cache_duration")
      .single();

    return durationData?.setting_value || "3600"; // Default 1 hour
  } catch (error) {
    console.error("Error getting cache control setting:", error);
    return "3600"; // Default to 1 hour on error
  }
}

export const storageService = {
  /**
   * Upload member avatar to Supabase Storage
   * @param file - Image file to upload
   * @param targetMemberId - Optional: Upload for specific member ID (for admins)
   * @returns Public URL of uploaded avatar
   */
  async uploadAvatar(
    userId: string,
    file: File
  ): Promise<string> {
    try {
      // Get cache control setting
      const cacheEnabled = await getCacheControl();

      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: cacheEnabled,
          upsert: true,
        });

      if (error) throw error;

      // Get public URL (same bucket)
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("uploadAvatar failed:", error);
      throw error;
    }
  },

  /**
   * Get avatar public URL from storage path
   * @param avatarPath - Storage path (e.g., "avatars/user-id/filename.jpg")
   * @returns Public URL or null
   */
  getAvatarUrl(avatarPath: string | null): string | null {
    if (!avatarPath) return null;
    
    // If already a full URL, return it
    if (avatarPath.startsWith("http")) return avatarPath;

    // Remove "avatars/" prefix if present
    const cleanPath = avatarPath.replace(/^avatars\//, "");
    
    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(cleanPath);

    return data.publicUrl;
  },

  /**
   * Delete avatar from storage
   * @param userId - Member's user ID
   */
  async deleteAvatar(userId: string): Promise<void> {
    const { data: files } = await supabase.storage
      .from("avatars")
      .list(userId);

    if (files && files.length > 0) {
      const filesToDelete = files.map((f) => `${userId}/${f.name}`);
      const { error } = await supabase.storage
        .from("avatars")
        .remove(filesToDelete);

      if (error) throw error;
    }
  },

  /**
   * Upload club logo to Supabase Storage
   * @param file - Image file to upload
   * @returns Public URL of uploaded logo
   */
  async uploadLogo(file: File): Promise<string> {
    const fileExt = file.name.split(".").pop();
    const fileName = `club-logo.${fileExt}`;
    const filePath = `logos/${fileName}`;

    // Delete old logo if exists
    const { data: existingFiles } = await supabase.storage
      .from("logos")
      .list("logos");

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `logos/${f.name}`);
      await supabase.storage.from("logos").remove(filesToDelete);
    }

    // Upload new logo
    const { data, error } = await supabase.storage
      .from("logos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("logos")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  },

  /**
   * Get logo public URL from storage path
   * @param logoPath - Storage path or full URL
   * @returns Public URL or null
   */
  getLogoUrl(logoPath: string | null): string | null {
    if (!logoPath) return null;
    
    // If already a full URL, return it
    if (logoPath.startsWith("http")) return logoPath;

    // Remove "logos/" prefix if present
    const cleanPath = logoPath.replace(/^logos\//, "");
    
    const { data } = supabase.storage
      .from("logos")
      .getPublicUrl(`logos/${cleanPath}`);

    return data.publicUrl;
  },

  /**
   * Delete club logo from storage
   */
  async deleteLogo(): Promise<void> {
    const { data: files } = await supabase.storage
      .from("logos")
      .list("logos");

    if (files && files.length > 0) {
      const filesToDelete = files.map((f) => `logos/${f.name}`);
      const { error } = await supabase.storage
        .from("logos")
        .remove(filesToDelete);

      if (error) throw error;
    }
  },

  /**
   * Upload image to Supabase Storage
   * @param file - Image file to upload
   * @param folder - Optional: Folder to upload to (default: "images")
   * @returns Public URL of uploaded image
   */
  async uploadImage(
    file: File,
    folder: string = "images"
  ): Promise<string> {
    try {
      // Get cache control setting
      const cacheEnabled = await getCacheControl();

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, file, {
          cacheControl: cacheEnabled,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL (same bucket)
      const { data: urlData } = supabase.storage
        .from("images")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("uploadImage failed:", error);
      throw error;
    }
  },
};