import { supabase } from "@/integrations/supabase/client";

export const storageService = {
  /**
   * Upload member avatar to Supabase Storage
   * @param file - Image file to upload
   * @returns Public URL of uploaded avatar
   */
  async uploadAvatar(file: File): Promise<string> {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    // Get member ID from session
    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", session.user.id)
      .single();

    if (!member) throw new Error("Member not found");

    const userId = member.id;
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Delete old avatar if exists
    const { data: existingFiles } = await supabase.storage
      .from("avatars")
      .list(userId);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${userId}/${f.name}`);
      await supabase.storage.from("avatars").remove(filesToDelete);
    }

    // Upload new avatar
    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
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
};