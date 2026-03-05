import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";

export function ClubSettings() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentLogo();
  }, []);

  const loadCurrentLogo = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("club_settings")
        .select("setting_value")
        .eq("setting_key", "club_logo")
        .maybeSingle();

      if (error) throw error;
      
      if (data?.setting_value) {
        setCurrentLogo(data.setting_value);
      }
    } catch (error) {
      console.error("Error loading logo:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan logo semasa.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Format Tidak Sah",
        description: "Sila pilih fail imej (PNG, JPG, atau SVG)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Saiz Fail Terlalu Besar",
        description: "Maksimum saiz fail adalah 2MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      const base64String = await convertToBase64(file);

      const { error } = await supabase
        .from("club_settings")
        .upsert(
          {
            setting_key: "club_logo",
            setting_value: base64String,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "setting_key",
          }
        );

      if (error) throw error;

      setCurrentLogo(base64String);
      toast({
        title: "Berjaya",
        description: "Logo kelab telah dikemaskini!",
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuat naik logo. Sila cuba lagi.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!confirm("Adakah anda pasti mahu membuang logo kelab?")) return;

    try {
      setUploading(true);

      const { error } = await supabase
        .from("club_settings")
        .delete()
        .eq("setting_key", "club_logo");

      if (error) throw error;

      setCurrentLogo(null);
      toast({
        title: "Berjaya",
        description: "Logo kelab telah dibuang.",
      });
    } catch (error) {
      console.error("Error deleting logo:", error);
      toast({
        title: "Ralat",
        description: "Gagal membuang logo. Sila cuba lagi.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pengurusan Logo Kelab</CardTitle>
          <CardDescription>
            Muat naik logo kelab untuk dipaparkan di dashboard ahli. Format yang disokong: PNG, JPG, SVG (Maksimum 2MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentLogo ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border-4 border-primary">
                  <img
                    src={currentLogo}
                    alt="Logo Kelab"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm text-muted-foreground">Logo Semasa</p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("logo-upload")?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Tukar Logo
                    </>
                  )}
                </Button>

                <Button
                  variant="destructive"
                  onClick={handleDeleteLogo}
                  disabled={uploading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Buang Logo
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4 py-8">
              <div className="w-32 h-32 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-4 border-dashed border-gray-300 dark:border-gray-700">
                <ImageIcon className="h-12 w-12 text-gray-400" />
              </div>
              <p className="text-sm text-muted-foreground">Tiada logo dimuat naik</p>
              
              <Button
                onClick={() => document.getElementById("logo-upload")?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Muat Naik Logo
                  </>
                )}
              </Button>
            </div>
          )}

          <input
            id="logo-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
            disabled={uploading}
          />
        </CardContent>
      </Card>
    </div>
  );
}