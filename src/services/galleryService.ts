import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type GalleryAlbum = Tables<"gallery_albums">;
type GalleryImage = Tables<"gallery_images">;
type GalleryPermission = Tables<"gallery_permissions">;

export type AlbumWithImages = GalleryAlbum & {
  images: GalleryImage[];
  image_count: number;
};

export type ImageWithAlbum = GalleryImage & {
  album: GalleryAlbum;
};

/**
 * Get all albums with image counts
 */
export async function getAllAlbums(): Promise<AlbumWithImages[]> {
  const { data: albums, error } = await supabase
    .from("gallery_albums")
    .select("*, gallery_images(count)")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Get albums error:", error);
    throw error;
  }

  return (albums || []).map((album: any) => ({
    ...album,
    images: [],
    image_count: album.gallery_images?.[0]?.count || 0
  }));
}

/**
 * Get single album with all images
 */
export async function getAlbumWithImages(albumId: string): Promise<AlbumWithImages | null> {
  const { data: album, error: albumError } = await supabase
    .from("gallery_albums")
    .select("*")
    .eq("id", albumId)
    .single();

  if (albumError) {
    console.error("Get album error:", albumError);
    throw albumError;
  }

  const { data: images, error: imagesError } = await supabase
    .from("gallery_images")
    .select("*")
    .eq("album_id", albumId)
    .order("sort_order", { ascending: true });

  if (imagesError) {
    console.error("Get images error:", imagesError);
    throw imagesError;
  }

  return {
    ...album,
    images: images || [],
    image_count: images?.length || 0
  };
}

/**
 * Get all images across all albums
 */
export async function getAllImages(): Promise<ImageWithAlbum[]> {
  const { data, error } = await supabase
    .from("gallery_images")
    .select("*, album:gallery_albums(*)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Get all images error:", error);
    throw error;
  }

  return (data || []).map((item: any) => ({
    ...item,
    album: item.album
  }));
}

/**
 * Create new album (Admin only)
 */
export async function createAlbum(
  name: string,
  description?: string,
  coverImageUrl?: string
): Promise<GalleryAlbum> {
  const { data: maxOrder } = await supabase
    .from("gallery_albums")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder = (maxOrder?.sort_order || 0) + 1;

  const { data, error } = await supabase
    .from("gallery_albums")
    .insert({
      name,
      description,
      cover_image_url: coverImageUrl,
      sort_order: sortOrder
    })
    .select()
    .single();

  if (error) {
    console.error("Create album error:", error);
    throw error;
  }

  return data;
}

/**
 * Update album (Admin/Delegated only)
 */
export async function updateAlbum(
  albumId: string,
  updates: {
    name?: string;
    description?: string;
    cover_image_url?: string;
  }
): Promise<GalleryAlbum> {
  const { data, error } = await supabase
    .from("gallery_albums")
    .update(updates)
    .eq("id", albumId)
    .select()
    .single();

  if (error) {
    console.error("Update album error:", error);
    throw error;
  }

  return data;
}

/**
 * Delete album (Admin only - will cascade delete images)
 */
export async function deleteAlbum(albumId: string): Promise<void> {
  const { error } = await supabase
    .from("gallery_albums")
    .delete()
    .eq("id", albumId);

  if (error) {
    console.error("Delete album error:", error);
    throw error;
  }
}

/**
 * Reorder albums (Admin only)
 */
export async function reorderAlbums(albumIds: string[]): Promise<void> {
  const updates = albumIds.map((id, index) => ({
    id,
    sort_order: index + 1
  }));

  for (const update of updates) {
    await supabase
      .from("gallery_albums")
      .update({ sort_order: update.sort_order })
      .eq("id", update.id);
  }
}

/**
 * Upload image to album (Admin/Delegated only)
 */
export async function uploadImage(
  albumId: string,
  file: File,
  caption?: string
): Promise<GalleryImage> {
  // Upload to Supabase Storage
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `gallery/${albumId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("gallery")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Upload error:", uploadError);
    throw uploadError;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("gallery")
    .getPublicUrl(filePath);

  // Get next sort order
  const { data: maxOrder } = await supabase
    .from("gallery_images")
    .select("sort_order")
    .eq("album_id", albumId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder = (maxOrder?.sort_order || 0) + 1;

  // Create image record
  const { data, error } = await supabase
    .from("gallery_images")
    .insert({
      album_id: albumId,
      image_url: urlData.publicUrl,
      storage_path: filePath,
      caption,
      sort_order: sortOrder
    })
    .select()
    .single();

  if (error) {
    console.error("Create image record error:", error);
    throw error;
  }

  return data;
}

/**
 * Update image (Admin/Delegated only)
 */
export async function updateImage(
  imageId: string,
  caption: string
): Promise<GalleryImage> {
  const { data, error } = await supabase
    .from("gallery_images")
    .update({ caption })
    .eq("id", imageId)
    .select()
    .single();

  if (error) {
    console.error("Update image error:", error);
    throw error;
  }

  return data;
}

/**
 * Delete image (Admin/Delegated only)
 */
export async function deleteImage(imageId: string): Promise<void> {
  // Get image details first
  const { data: image } = await supabase
    .from("gallery_images")
    .select("storage_path")
    .eq("id", imageId)
    .single();

  if (image?.storage_path) {
    // Delete from storage
    await supabase.storage
      .from("gallery")
      .remove([image.storage_path]);
  }

  // Delete record
  const { error } = await supabase
    .from("gallery_images")
    .delete()
    .eq("id", imageId);

  if (error) {
    console.error("Delete image error:", error);
    throw error;
  }
}

/**
 * Reorder images in album (Admin/Delegated only)
 */
export async function reorderImages(imageIds: string[]): Promise<void> {
  const updates = imageIds.map((id, index) => ({
    id,
    sort_order: index + 1
  }));

  for (const update of updates) {
    await supabase
      .from("gallery_images")
      .update({ sort_order: update.sort_order })
      .eq("id", update.id);
  }
}

/**
 * Check if member has gallery permissions
 */
export async function checkMemberPermissions(memberId: string): Promise<{
  canManage: boolean;
  albumIds: string[];
}> {
  const { data: member } = await supabase
    .from("members")
    .select("is_admin")
    .eq("id", memberId)
    .single();

  if (member?.is_admin) {
    return { canManage: true, albumIds: [] };
  }

  const { data: permissions } = await supabase
    .from("gallery_permissions")
    .select("album_id")
    .eq("member_id", memberId);

  return {
    canManage: (permissions?.length || 0) > 0,
    albumIds: permissions?.map((p) => p.album_id) || []
  };
}

/**
 * Grant permission to member (Admin only)
 */
export async function grantPermission(
  memberId: string,
  albumId: string | null
): Promise<GalleryPermission> {
  const { data, error } = await supabase
    .from("gallery_permissions")
    .insert({
      member_id: memberId,
      album_id: albumId
    })
    .select()
    .single();

  if (error) {
    console.error("Grant permission error:", error);
    throw error;
  }

  return data;
}

/**
 * Revoke permission from member (Admin only)
 */
export async function revokePermission(permissionId: string): Promise<void> {
  const { error } = await supabase
    .from("gallery_permissions")
    .delete()
    .eq("id", permissionId);

  if (error) {
    console.error("Revoke permission error:", error);
    throw error;
  }
}

/**
 * Get all permissions (Admin only)
 */
export async function getAllPermissions(): Promise<Array<GalleryPermission & {
  member: { username: string; full_name: string };
  album: { name: string } | null;
}>> {
  const { data, error } = await supabase
    .from("gallery_permissions")
    .select(`
      *,
      member:members!gallery_permissions_member_id_fkey(username, full_name),
      album:gallery_albums(name)
    `);

  if (error) {
    console.error("Get permissions error:", error);
    throw error;
  }

  return (data || []).map((item: any) => ({
    ...item,
    member: item.member,
    album: item.album
  }));
}