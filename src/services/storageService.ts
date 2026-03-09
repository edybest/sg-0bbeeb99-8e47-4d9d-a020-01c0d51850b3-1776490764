import { supabase } from "@/integrations/supabase/client";

/**
 * Get cache control setting from database
 * Returns true (enabl
...
ue) by default
 */
async function getCacheControl(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("club_settings")
      .select("setting_value")
      .eq("setting_key", "enable_cache")
      .maybeSingle();

    if (error) {
      console.error("Error fetching cache setting:", error);
      return true; // Default to cache enabled on error
    }

    // If setting doesn't exist, default to true (cache enabled)
    if (!data) {
      return true;
    }

    return data.setting_value === "true";
  } catch (error) {
    console.error("Error in getCacheControl:", error);
    return true; // Default to cache enabled on error
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
      const cacheEnabled = await getCacheControl();
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("member-assets")
        .upload(filePath, file, {
          cacheControl: cacheEnabled ? "3600" : "0",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("member-assets")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
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
      const cacheEnabled = await getCacheControl();
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("member-assets")
        .upload(filePath, file, {
          cacheControl: cacheEnabled ? "3600" : "0",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("member-assets")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      throw error;
    }
  },
};