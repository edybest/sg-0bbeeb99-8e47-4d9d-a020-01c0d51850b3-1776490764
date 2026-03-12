import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Plus,
  FolderPlus,
  Upload,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Folder,
} from "lucide-react";
import { ClubLogo } from "@/components/ClubLogo";
import { useAuth } from "@/hooks/useAuth";
import { PageAccessGuard } from "@/components/PageAccessGuard";
import {
  getAllAlbums,
  getAlbumWithImages,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  uploadImage,
  updateImage,
  deleteImage,
  checkMemberPermissions,
  type AlbumWithImages,
  type ImageWithAlbum,
  type GalleryImageWithThumbnail,
} from "@/services/galleryService";
import type { Tables } from "@/integrations/supabase/types";

type GalleryImage = Tables<"gallery_images">;

export default function GalleryPage() {
  const router = useRouter();
  const { member, loading: authLoading, isAuthenticated } = useAuth(false);
  
  const [albums, setAlbums] = useState<AlbumWithImages[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithImages | null>(null);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  
  const [canManage, setCanManage] = useState(false);
  const [managedAlbumIds, setManagedAlbumIds] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Album form
  const [showAlbumDialog, setShowAlbumDialog] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<AlbumWithImages | null>(null);
  const [albumName, setAlbumName] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  
  // Image form
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadAlbumId, setUploadAlbumId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageCaption, setImageCaption] = useState("");
  
  // Edit image
  const [showEditImageDialog, setShowEditImageDialog] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImageWithThumbnail | null>(null);
  const [editImageCaption, setEditImageCaption] = useState("");
  
  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: "album" | "image"; id: string } | null>(null);

  useEffect(() => {
    if (member) {
      loadData();
    }
  }, [member]);

  async function loadData() {
    try {
      setLoading(true);
      const [albumsData, permissions] = await Promise.all([
        getAllAlbums(),
        member ? checkMemberPermissions(member.id) : Promise.resolve({ canManage: false, albumIds: [] })
      ]);
      
      setAlbums(albumsData);
      setCanManage(permissions.canManage);
      setManagedAlbumIds(permissions.albumIds);
    } catch (error) {
      console.error("Load gallery error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAlbumImages(albumId: string) {
    try {
      const albumData = await getAlbumWithImages(albumId);
      setSelectedAlbum(albumData);
    } catch (error) {
      console.error("Load album images error:", error);
    }
  }

  function canManageAlbum(albumId: string): boolean {
    if (member?.is_admin) return true;
    if (managedAlbumIds.length === 0) return false;
    return managedAlbumIds.includes(albumId);
  }

  async function handleCreateOrUpdateAlbum() {
    if (!albumName.trim()) return;
    
    try {
      setUploading(true);
      if (editingAlbum) {
        await updateAlbum(editingAlbum.id, {
          name: albumName,
          description: albumDescription || undefined
        });
      } else {
        await createAlbum(albumName, albumDescription || undefined);
      }
      
      await loadData();
      setShowAlbumDialog(false);
      resetAlbumForm();
    } catch (error) {
      console.error("Save album error:", error);
    } finally {
      setUploading(false);
    }
  }

  function openEditAlbumDialog(album: AlbumWithImages) {
    setEditingAlbum(album);
    setAlbumName(album.name);
    setAlbumDescription(album.description || "");
    setShowAlbumDialog(true);
  }

  function resetAlbumForm() {
    setEditingAlbum(null);
    setAlbumName("");
    setAlbumDescription("");
  }

  async function handleUploadImage() {
    if (!selectedFile || !uploadAlbumId) return;
    
    try {
      setUploading(true);
      await uploadImage(uploadAlbumId, selectedFile, imageCaption || undefined);
      
      if (selectedAlbum?.id === uploadAlbumId) {
        await loadAlbumImages(uploadAlbumId);
      }
      await loadData();
      
      setShowUploadDialog(false);
      resetUploadForm();
    } catch (error) {
      console.error("Upload image error:", error);
    } finally {
      setUploading(false);
    }
  }

  function openUploadDialog(albumId: string) {
    setUploadAlbumId(albumId);
    setShowUploadDialog(true);
  }

  function resetUploadForm() {
    setSelectedFile(null);
    setImageCaption("");
    setUploadAlbumId("");
  }

  async function handleUpdateImage() {
    if (!editingImage) return;
    
    try {
      setUploading(true);
      await updateImage(editingImage.id, editImageCaption);
      
      if (selectedAlbum) {
        await loadAlbumImages(selectedAlbum.id);
      }
      
      setShowEditImageDialog(false);
      setEditingImage(null);
      setEditImageCaption("");
    } catch (error) {
      console.error("Update image error:", error);
    } finally {
      setUploading(false);
    }
  }

  function openEditImageDialog(image: GalleryImageWithThumbnail) {
    setEditingImage(image);
    setEditImageCaption(image.description || image.title || "");
    setShowEditImageDialog(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    
    try {
      setUploading(true);
      if (deleteTarget.type === "album") {
        await deleteAlbum(deleteTarget.id);
        if (selectedAlbum?.id === deleteTarget.id) {
          setSelectedAlbum(null);
        }
        await loadData();
      } else {
        await deleteImage(deleteTarget.id);
        if (selectedAlbum) {
          await loadAlbumImages(selectedAlbum.id);
        }
        await loadData();
      }
      setDeleteTarget(null);
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setUploading(false);
    }
  }

  function openLightbox(index: number) {
    setLightboxIndex(index);
  }

  function closeLightbox() {
    setLightboxIndex(-1);
  }

  function nextImage() {
    if (!selectedAlbum) return;
    setLightboxIndex((prev) => (prev + 1) % selectedAlbum.images.length);
  }

  function prevImage() {
    if (!selectedAlbum) return;
    setLightboxIndex((prev) => (prev - 1 + selectedAlbum.images.length) % selectedAlbum.images.length);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <PageAccessGuard pagePath="/member/gallery" requireAuth={true}>
      <>
        <SEO title="Gallery - AMBC Club" description="Club photo gallery and albums" />
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
          {/* Header */}
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-3">
                {selectedAlbum ? (
                  <Button variant="ghost" size="icon" onClick={() => setSelectedAlbum(null)}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                ) : (
                  <Link href="/member">
                    <Button variant="ghost" size="icon">
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  </Link>
                )}
                <ClubLogo size="sm" />
                <div>
                  <h1 className="text-lg font-bold">
                    {selectedAlbum ? selectedAlbum.name : "Gallery"}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {selectedAlbum ? `${selectedAlbum.images.length} gambar` : "Album & Foto"}
                  </p>
                </div>
              </div>

              {canManage && (
                <div className="flex gap-2">
                  {selectedAlbum ? (
                    <>
                      <Button size="sm" onClick={() => openUploadDialog(selectedAlbum.id)}>
                        <Upload className="h-4 w-4 mr-1" />
                        Upload
                      </Button>
                      {canManageAlbum(selectedAlbum.id) && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openEditAlbumDialog(selectedAlbum)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteTarget({ type: "album", id: selectedAlbum.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    <Button size="sm" onClick={() => setShowAlbumDialog(true)}>
                      <FolderPlus className="h-4 w-4 mr-1" />
                      Album Baru
                    </Button>
                  )}
                </div>
              )}
            </div>
          </header>

          {/* Content */}
          <main className="container mx-auto px-4 py-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : selectedAlbum ? (
              /* Album Images View */
              <>
                {selectedAlbum.description && (
                  <Card className="mb-6 bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-700">{selectedAlbum.description}</p>
                    </CardContent>
                  </Card>
                )}

                {selectedAlbum.images.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                      <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>Belum ada gambar dalam album ini</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {selectedAlbum.images.map((image, index) => (
                      <Card key={image.id} className="overflow-hidden group relative">
                        <div className="aspect-square relative cursor-pointer" onClick={() => openLightbox(index)}>
                          <Image
                            src={image.thumbnail_url || image.image_url}
                            alt={image.description || image.title || "Gallery image"}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                            placeholder="blur"
                            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                          />
                          {(image.description || image.title) && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs">
                              {image.description || image.title}
                            </div>
                          )}
                        </div>
                        {canManageAlbum(selectedAlbum.id) && (
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditImageDialog(image);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget({ type: "image", id: image.id });
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Albums Grid */
              <>
                {albums.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                      <Folder className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>Belum ada album</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {albums.map((album) => (
                      <Card
                        key={album.id}
                        className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all"
                        onClick={() => loadAlbumImages(album.id)}
                      >
                        <div className="aspect-video relative bg-gray-100">
                          {album.cover_image_thumbnail ? (
                            <Image
                              src={album.cover_image_thumbnail}
                              alt={album.name}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover"
                              loading="lazy"
                              placeholder="blur"
                              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                            />
                          ) : (
                            <div className="h-full flex items-center justify-center">
                              <Folder className="h-16 w-16 text-gray-300" />
                            </div>
                          )}
                          <Badge className="absolute top-2 right-2 bg-black/60">
                            {album.image_count} gambar
                          </Badge>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-bold text-lg mb-1">{album.name}</h3>
                          {album.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{album.description}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </main>

          {/* Lightbox */}
          {lightboxIndex >= 0 && selectedAlbum && (
            <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
              <button
                className="absolute top-4 right-4 text-white hover:text-gray-300"
                onClick={closeLightbox}
              >
                <X className="h-8 w-8" />
              </button>
              <button
                className="absolute left-4 text-white hover:text-gray-300 disabled:opacity-30"
                onClick={prevImage}
                disabled={selectedAlbum.images.length <= 1}
              >
                <ChevronLeft className="h-12 w-12" />
              </button>
              <button
                className="absolute right-4 text-white hover:text-gray-300 disabled:opacity-30"
                onClick={nextImage}
                disabled={selectedAlbum.images.length <= 1}
              >
                <ChevronRight className="h-12 w-12" />
              </button>
              <div className="max-w-6xl max-h-[90vh] relative">
                <Image
                  src={selectedAlbum.images[lightboxIndex].image_url}
                  alt={selectedAlbum.images[lightboxIndex].description || selectedAlbum.images[lightboxIndex].title || "Gallery image"}
                  width={1200}
                  height={900}
                  className="max-h-[90vh] w-auto object-contain"
                  priority
                  quality={90}
                />
                {(selectedAlbum.images[lightboxIndex].description || selectedAlbum.images[lightboxIndex].title) && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white p-4 text-center">
                    {selectedAlbum.images[lightboxIndex].description || selectedAlbum.images[lightboxIndex].title}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Album Dialog */}
          <Dialog open={showAlbumDialog} onOpenChange={setShowAlbumDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAlbum ? "Edit Album" : "Album Baru"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nama Album</label>
                  <Input
                    value={albumName}
                    onChange={(e) => setAlbumName(e.target.value)}
                    placeholder="Contoh: Trip Genting 2024"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Keterangan (optional)</label>
                  <Textarea
                    value={albumDescription}
                    onChange={(e) => setAlbumDescription(e.target.value)}
                    placeholder="Penerangan tentang album ini..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowAlbumDialog(false); resetAlbumForm(); }}>
                  Batal
                </Button>
                <Button onClick={handleCreateOrUpdateAlbum} disabled={uploading || !albumName.trim()}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingAlbum ? "Simpan" : "Buat Album")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Upload Dialog */}
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Gambar</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Pilih Gambar</label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Caption (optional)</label>
                  <Textarea
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                    placeholder="Keterangan gambar..."
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowUploadDialog(false); resetUploadForm(); }}>
                  Batal
                </Button>
                <Button onClick={handleUploadImage} disabled={uploading || !selectedFile}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Image Dialog */}
          <Dialog open={showEditImageDialog} onOpenChange={setShowEditImageDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Caption</DialogTitle>
              </DialogHeader>
              <div>
                <label className="text-sm font-medium">Caption</label>
                <Textarea
                  value={editImageCaption}
                  onChange={(e) => setEditImageCaption(e.target.value)}
                  placeholder="Keterangan gambar..."
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditImageDialog(false)}>
                  Batal
                </Button>
                <Button onClick={handleUpdateImage} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation */}
          <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteTarget?.type === "album"
                    ? "Semua gambar dalam album ini akan turut dipadam. Tindakan ini tidak boleh dibatalkan."
                    : "Gambar ini akan dipadam secara kekal. Tindakan ini tidak boleh dibatalkan."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </>
    </PageAccessGuard>
  );
}