import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { storageService } from "@/services/storageService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

export function ClubSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentLogo();
  }, []);

  async function loadCurrentLogo() {
    try {
      const { data, error } = await supabase
        .from("club_settings")
        .select("setting_value")
        .eq("setting_key", "club_logo")
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data?.setting_value) {
        const logoUrl = storageService.getLogoUrl(data.setting_value);
        setCurrentLogo(logoUrl);
        setPreviewLogo(logoUrl);
      }
    } catch (error) {
      console.error("Error loading logo:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Format Tidak Sah",
        description: "Sila pilih fail imej (PNG, JPG, atau SVG)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Saiz Fail Terlalu Besar",
        description: "Saiz fail maksimum ialah 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload logo to storage
      const logoUrl = await storageService.uploadLogo(file);

      // Save logo URL to database
      const { error } = await supabase
        .from("club_settings")
        .upsert({
          setting_key: "club_logo",
          setting_value: logoUrl,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setCurrentLogo(logoUrl);
      setPreviewLogo(logoUrl);

      toast({
        title: "✅ Berjaya",
        description: "Logo AMBC Club telah dikemaskini!",
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: "❌ Ralat",
        description: "Gagal memuat naik logo. Cuba lagi.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveLogo() {
    if (!confirm("Adakah anda pasti mahu membuang logo?")) return;

    setUploading(true);

    try {
      // Delete logo from storage
      if (currentLogo) {
        await storageService.deleteLogo();
      }

      // Remove from database
      const { error } = await supabase
        .from("club_settings")
        .delete()
        .eq("setting_key", "club_logo");

      if (error) throw error;

      setCurrentLogo(null);
      setPreviewLogo(null);

      toast({
        title: "✅ Berjaya",
        description: "Logo telah dibuang.",
      });
    } catch (error) {
      console.error("Error removing logo:", error);
      toast({
        title: "❌ Ralat",
        description: "Gagal membuang logo. Cuba lagi.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-red-50 to-white">
        <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-red-600" />
          Pengurusan Logo Kelab
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Current Logo Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Logo Semasa</Label>
            <div className="flex items-center gap-6">
              <div className="relative">
                {previewLogo ? (
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-red-600 shadow-lg">
                    <Image
                      src={previewLogo}
                      alt="AMBC Club Logo"
                      width={128}
                      height={128}
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-dashed border-gray-300 flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <p className="text-sm text-gray-600">
                  {previewLogo
                    ? "Logo kelab sedia ada. Muat naik imej baru untuk menggantikannya."
                    : "Tiada logo diset. Muat naik imej logo kelab."}
                </p>
                <div className="flex gap-2">
                  <Label
                    htmlFor="logo-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memuat Naik...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {previewLogo ? "Tukar Logo" : "Muat Naik Logo"}
                      </>
                    )}
                  </Label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                    className="hidden"
                  />

                  {previewLogo && (
                    <Button
                      variant="outline"
                      onClick={handleRemoveLogo}
                      disabled={uploading}
                      className="border-gray-300 hover:bg-gray-100"
                    >
                      Buang Logo
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Upload Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">📋 Garis Panduan Logo:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Format: PNG, JPG, atau SVG</li>
              <li>Saiz maksimum: 2MB</li>
              <li>Cadangan: Imej persegi (contoh: 500x500px)</li>
              <li>Logo akan dipaparkan dalam bentuk bulat di member dashboard</li>
              <li>Untuk hasil terbaik, gunakan background transparan (PNG)</li>
            </ul>
          </div>

          {/* Preview in Context */}
          {previewLogo && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4">👁️ Preview di Dashboard Ahli:</h4>
              <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-red-600 shadow-md">
                  <Image
                    src={previewLogo}
                    alt="Preview"
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-red-600">AMBC CLUB</h1>
                  <p className="text-sm text-gray-600">Selamat datang, Ahli</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}