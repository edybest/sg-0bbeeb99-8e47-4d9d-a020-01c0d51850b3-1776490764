import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type GalleryAlbum = Tables<"gallery_albums">;
type GalleryImage = Tables<"gallery_images">;
type GalleryPermission = Tables<"gallery_permissions">;

export type GalleryImageWithThumbnail = GalleryImage & {
  thumbnail_url?: string;
};

export type AlbumWithImages = GalleryAlbum & {
  images: GalleryImageWithThumbnail[];
  image_count: number;
  cover_image_thumbnail?: string;
};

export type ImageWithAlbum = GalleryImage & {
  album: GalleryAlbum;
  thumbnail_url?: string;
};

export type GalleryDebugInfo = {
  step: string;
  data?: unknown;
  error?: {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
    status?: number;
  } | null;
};

function toDebugError(err: unknown): GalleryDebugInfo["error"] {
  if (!err || typeof err !== "object") return { message: String(err) };
  const e = err as any;
  return {
    message: e.message,
    details: e.details,
    hint: e.hint,
    code: e.code,
    status: e.status
  };
}

async function requireAuthUserId(debugLog?: GalleryDebugInfo[]): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  debugLog?.push({ step: "auth.getUser", data: { user: data.user ? { id: data.user.id, email: data.user.email } : null }, error: error ? toDebugError(error) : null });

  const userId = data.user?.id;
  if (!userId) {
    const err = new Error("Authentication required");
    debugLog?.push({ step: "auth.missingUser", error: toDebugError(err) });
    throw err;
  }
  return userId;
}

/**
 * Generate optimized thumbnail URL using Supabase image transformations
 */
export function getThumbnailUrl(imageUrl: string, width: number = 300, height: number = 300): string {
  if (!imageUrl) return imageUrl;
  
  // Extract the storage path from the public URL
  const urlParts = imageUrl.split('/storage/v1/object/public/gallery/');
  if (urlParts.length !== 2) return imageUrl;
  
  const storagePath = urlParts[1];
  
  // Use Supabase image transformation API
  const { data } = supabase.storage
    .from('gallery')
    .getPublicUrl(storagePath, {
      transform: {
        width,
        height,
        resize: 'cover',
        quality: 80
      }
    });
  
  return data.publicUrl;
}

/**
 * Get all albums with image counts and optimized cover images
 */
export async function getAllAlbums(): Promise<AlbumWithImages[]> {
  const { data: albums, error } = await supabase
    .from("gallery_albums")
    .select("*, gallery_images(count)")
    .order("position_order", { ascending: true });

  if (error) {
    console.error("Get albums error:", error);
    throw error;
  }

  return (albums || []).map((album: any) => {
    const coverUrl = album.cover_image_url;
    return {
      ...album,
      images: [],
      image_count: album.gallery_images?.[0]?.count || 0,
      cover_image_thumbnail: coverUrl ? getThumbnailUrl(coverUrl, 400, 300) : undefined
    };
  });
}

/**
 * Get single album with all images and thumbnails
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
    .order("position_order", { ascending: true });

  if (imagesError) {
    console.error("Get images error:", imagesError);
    throw imagesError;
  }

  // Add thumbnail URLs to images
  const imagesWithThumbnails = (images || []).map(img => ({
    ...img,
    thumbnail_url: getThumbnailUrl(img.image_url, 400, 400)
  }));

  return {
    ...album,
    images: imagesWithThumbnails,
    image_count: images?.length || 0,
    cover_image_thumbnail: album.cover_image_url ? getThumbnailUrl(album.cover_image_url, 400, 300) : undefined
  };
}

/**
 * Get all images across all albums with thumbnails
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
    album: item.album,
    thumbnail_url: getThumbnailUrl(item.image_url, 400, 400)
  }));
}

/**
 * Create new album (Admin only)
 */
export async function createAlbum(
  name: string,
  description?: string,
  coverImageUrl?: string,
  memberId?: string,
  debug?: boolean
): Promise<GalleryAlbum | { album: GalleryAlbum | null; debug: GalleryDebugInfo[] }> {
  const debugLog: GalleryDebugInfo[] = [];

  const { data: maxOrder, error: maxOrderError } = await supabase
    .from("gallery_albums")
    .select("position_order")
    .order("position_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  debugLog.push({ step: "maxOrder", data: maxOrder, error: maxOrderError ? toDebugError(maxOrderError) : null });

  const sortOrder = ((maxOrder as any)?.position_order || 0) + 1;

  let userId: string | null = null;
  try {
    userId = memberId || await requireAuthUserId(debugLog);
  } catch (e) {
    if (debug) return { album: null, debug: debugLog };
    throw e;
  }

  debugLog.push({
    step: "resolvedUser",
    data: { memberIdArg: memberId, resolvedUserId: userId, sortOrder },
    error: null
  });

  const { data, error } = await supabase
    .from("gallery_albums")
    .insert({
      name,
      description,
      cover_image_url: coverImageUrl,
      position_order: sortOrder,
      created_by: userId
    })
    .select()
    .maybeSingle();

  debugLog.push({ step: "insertAlbum", data, error: error ? toDebugError(error) : null });

  if (error) {
    if (debug) return { album: null, debug: debugLog };
    console.error("Create album error:", error);
    throw error;
  }

  if (!data) {
    const err = new Error("Album insert returned no data");
    debugLog.push({ step: "insertAlbumNoData", error: toDebugError(err) });
    if (debug) return { album: null, debug: debugLog };
    throw err;
  }

  if (debug) return { album: data, debug: debugLog };

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
  console.log("updateAlbum: starting", { albumId, updates });

  const { data, error } = await supabase
    .from("gallery_albums")
    .update(updates)
    .eq("id", albumId)
    .select()
    .single();

  console.log("updateAlbum: result", { data, error });

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
    position_order: index + 1
  }));

  for (const update of updates) {
    await supabase
      .from("gallery_albums")
      .update({ position_order: update.position_order })
      .eq("id", update.id);
  }
}

/**
 * Upload image to album (Admin/Delegated only)
 */
export async function uploadImage(
  albumId: string,
  file: File,
  title?: string,
  memberId?: string
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
  const { data: maxOrder, error: maxOrderError } = await supabase
    .from("gallery_images")
    .select("position_order")
    .eq("album_id", albumId)
    .order("position_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxOrderError) {
    console.error("Get max order error:", maxOrderError);
    throw maxOrderError;
  }

  const sortOrder = ((maxOrder as any)?.position_order || 0) + 1;

  let userId: string | null = null;
  if (memberId) {
    userId = memberId;
  } else {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    userId = userData.user?.id || null;
  }

  if (!userId) {
    throw new Error("Authentication required to upload image");
  }

  // Create image record
  const { data, error } = await supabase
    .from("gallery_images")
    .insert({
      album_id: albumId,
      image_url: urlData.publicUrl,
      title: title || file.name,
      description: title,
      position_order: sortOrder,
      uploaded_by: userId
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
  title: string
): Promise<GalleryImage> {
  const { data, error } = await supabase
    .from("gallery_images")
    .update({ 
      title,
      description: title
    })
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
  const { data: image } = await supabase
    .from("gallery_images")
    .select("image_url, album_id")
    .eq("id", imageId)
    .single();

  if (image?.image_url) {
    try {
      const urlParts = image.image_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `gallery/${image.album_id}/${fileName}`;
      
      await supabase.storage
        .from("gallery")
        .remove([filePath]);
    } catch (e) {
      console.error("Failed to parse image URL for storage deletion", e);
    }
  }

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
    position_order: index + 1
  }));

  for (const update of updates) {
    await supabase
      .from("gallery_images")
      .update({ position_order: update.position_order })
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
    .select("*")
    .eq("member_id", memberId)
    .single();

  const hasGlobalPermission = !!permissions && (
    permissions.can_add_albums || 
    permissions.can_add_images || 
    permissions.can_edit_albums || 
    permissions.can_edit_images
  );

  return {
    canManage: hasGlobalPermission,
    albumIds: []
  };
}

/**
 * Get all permissions (Admin only)
 */
export async function getAllPermissions(): Promise<Array<GalleryPermission & {
  member: { username: string; full_name: string };
}>> {
  const { data, error } = await supabase
    .from("gallery_permissions")
    .select(`
      *,
      member:members!gallery_permissions_member_id_fkey(username, full_name)
    `);

  if (error) {
    console.error("Get permissions error:", error);
    throw error;
  }

  return (data || []).map((item: any) => ({
    ...item,
    member: item.member
  }));
}