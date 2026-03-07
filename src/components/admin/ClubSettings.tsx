import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Trash2, Plus, Edit, X, Info } from "lucide-react";
import { storageService } from "@/services/storageService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

type FiveFivePrizeConfig = {
  id: string;
  player_count: number;
  prize_count: number;
  prizes: number[];
};

export function ClubSettings() {
  const [clubName, setClubName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // FiveFive prize configurations state
  const [fivefiveConfigs, setFivefiveConfigs] = useState<FiveFivePrizeConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  
  // Dialog state for Add/Edit
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<FiveFivePrizeConfig | null>(null);
  const [dialogPlayerCount, setDialogPlayerCount] = useState(1);
  const [dialogPrizeCount, setDialogPrizeCount] = useState(1);
  const [dialogPrizes, setDialogPrizes] = useState<number[]>([100]);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadFiveFiveConfigs();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("club_settings")
        .select("*");

      if (error) throw error;

      if (data) {
        const nameSetting = data.find(s => s.setting_key === 'club_name');
        const logoSetting = data.find(s => s.setting_key === 'logo_url');
        
        if (nameSetting) setClubName(nameSetting.setting_value || "");
        if (logoSetting && logoSetting.setting_value) {
          setLogoUrl(logoSetting.setting_value);
          setLogoPreview(logoSetting.setting_value);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFiveFiveConfigs = async () => {
    setLoadingConfigs(true);
    try {
      const { data, error } = await supabase
        .from("fivefive_prizes")
        .select("*")
        .order("player_count", { ascending: true });

      if (error) throw error;

      if (data) {
        const configs = data.map((config) => ({
          id: config.id,
          player_count: config.player_count,
          prize_count: config.prize_count,
          prizes: Array.isArray(config.prizes) ? config.prizes.map(Number) : [],
        }));
        setFivefiveConfigs(configs);
      }
    } catch (error: any) {
      toast({
        title: "Error loading FiveFive configurations",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingConfigs(false);
    }
  };

  const handleSaveClubSettings = async () => {
    if (!clubName.trim()) {
      toast({
        title: "Error",
        description: "Club name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let finalLogoUrl = logoUrl;

      if (logoFile) {
        setUploading(true);
        const uploadedUrl = await storageService.uploadLogo(logoFile);
        finalLogoUrl = uploadedUrl;
        setLogoUrl(uploadedUrl);
        setLogoPreview(uploadedUrl);
        setUploading(false);
      }

      const { data: existingName } = await supabase
        .from("club_settings")
        .select("id")
        .eq("setting_key", "club_name")
        .maybeSingle();

      if (existingName) {
        await supabase
          .from("club_settings")
          .update({
            setting_value: clubName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingName.id);
      } else {
        await supabase.from("club_settings").insert({
          setting_key: "club_name",
          setting_value: clubName,
        });
      }

      if (finalLogoUrl) {
        const { data: existingLogo } = await supabase
          .from("club_settings")
          .select("id")
          .eq("setting_key", "logo_url")
          .maybeSingle();

        if (existingLogo) {
          await supabase
            .from("club_settings")
            .update({
              setting_value: finalLogoUrl,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingLogo.id);
        } else {
          await supabase.from("club_settings").insert({
            setting_key: "logo_url",
            setting_value: finalLogoUrl,
          });
        }
      }

      toast({
        title: "Success",
        description: "Club settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setUploading(false);
      setLogoFile(null);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast({
          title: "Error",
          description: "File must be an image",
          variant: "destructive",
        });
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteLogo = async () => {
    if (!logoUrl) return;

    setLoading(true);
    try {
      await storageService.deleteLogo();

      const { data: existing } = await supabase
        .from("club_settings")
        .select("id")
        .eq("setting_key", "club_logo_url")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("club_settings")
          .update({ setting_value: "" })
          .eq("id", existing.id);

        if (error) throw error;
      }

      setLogoUrl("");
      setLogoPreview("");
      setLogoFile(null);
      
      // Force refresh
      window.dispatchEvent(new CustomEvent("logo-updated", { detail: { logoUrl: "" } }));

      toast({
        title: "Success",
        description: "Logo deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // FiveFive Config Dialog Functions
  const openAddConfigDialog = () => {
    setEditingConfig(null);
    setDialogPlayerCount(1);
    setDialogPrizeCount(1);
    setDialogPrizes([100]);
    setConfigDialogOpen(true);
  };

  const openEditConfigDialog = (config: FiveFivePrizeConfig) => {
    setEditingConfig(config);
    setDialogPlayerCount(config.player_count);
    setDialogPrizeCount(config.prize_count);
    setDialogPrizes([...config.prizes]);
    setConfigDialogOpen(true);
  };

  const handlePrizeCountChange = (count: number) => {
    setDialogPrizeCount(count);
    const newPrizes = [...dialogPrizes];

    if (count > newPrizes.length) {
      const lastPrize = newPrizes[newPrizes.length - 1] || 100;
      for (let i = newPrizes.length; i < count; i++) {
        newPrizes.push(Math.max(10, lastPrize - 20 * (i - newPrizes.length + 1)));
      }
    } else if (count < newPrizes.length) {
      newPrizes.splice(count);
    }

    setDialogPrizes(newPrizes);
  };

  const handlePrizeChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newPrizes = [...dialogPrizes];
    newPrizes[index] = numValue;
    setDialogPrizes(newPrizes);
  };

  const handleSaveConfig = async () => {
    // Validation
    if (dialogPlayerCount <= 0 || dialogPlayerCount > 50) {
      toast({
        title: "Error",
        description: "Player count must be between 1 and 50",
        variant: "destructive",
      });
      return;
    }

    if (dialogPrizeCount <= 0 || dialogPrizeCount > dialogPlayerCount) {
      toast({
        title: "Error",
        description: "Prize count must be between 1 and player count",
        variant: "destructive",
      });
      return;
    }

    if (dialogPrizes.some((p) => p <= 0)) {
      toast({
        title: "Error",
        description: "All prizes must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate player_count (only if adding new or changing player_count)
    if (!editingConfig || editingConfig.player_count !== dialogPlayerCount) {
      const duplicate = fivefiveConfigs.find(
        (c) => c.player_count === dialogPlayerCount && c.id !== editingConfig?.id
      );
      if (duplicate) {
        toast({
          title: "Error",
          description: `Configuration for ${dialogPlayerCount} player(s) already exists`,
          variant: "destructive",
        });
        return;
      }
    }

    setSavingConfig(true);
    try {
      const configData = {
        player_count: dialogPlayerCount,
        prize_count: dialogPrizeCount,
        prizes: dialogPrizes,
      };

      if (editingConfig) {
        // Update existing
        const { error } = await supabase
          .from("fivefive_prizes")
          .update(configData)
          .eq("id", editingConfig.id);

        if (error) throw error;

        toast({
          title: "✅ Berjaya!",
          description: `Configuration untuk ${dialogPlayerCount} pemain telah dikemaskini.`,
        });
      } else {
        // Insert new
        const { error } = await supabase.from("fivefive_prizes").insert(configData);

        if (error) throw error;

        toast({
          title: "✅ Berjaya!",
          description: `Configuration untuk ${dialogPlayerCount} pemain telah ditambah.`,
        });
      }

      setConfigDialogOpen(false);
      loadFiveFiveConfigs();
    } catch (error: any) {
      toast({
        title: "❌ Ralat",
        description: error.message || "Gagal menyimpan configuration.",
        variant: "destructive",
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDeleteConfig = async () => {
    try {
      if (!configToDelete) return;

      const configToDeleteData = fivefiveConfigs.find((c) => c.id === configToDelete);

      const { error } = await supabase
        .from("fivefive_prizes")
        .delete()
        .eq("id", configToDelete);

      if (error) throw error;

      toast({
        title: "✅ Berjaya!",
        description: `Configuration untuk ${configToDeleteData?.player_count} pemain telah dipadam.`,
      });

      setDeleteDialogOpen(false);
      setConfigToDelete(null);
      loadFiveFiveConfigs();
    } catch (error: any) {
      toast({
        title: "❌ Ralat",
        description: error.message || "Gagal memadam configuration.",
        variant: "destructive",
      });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);

      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `club-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("club-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("club-assets")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Save to club_settings
      const { error: settingError } = await supabase
        .from("club_settings")
        .upsert({
          setting_key: "club_logo_url",
          setting_value: publicUrl,
        });

      if (settingError) throw settingError;

      setLogoUrl(publicUrl);
      
      // Force refresh by triggering a custom event
      window.dispatchEvent(new CustomEvent("logo-updated", { detail: { logoUrl: publicUrl } }));

      toast({
        title: "✅ Berjaya!",
        description: "Logo kelab telah dikemaskini.",
      });
    } catch (error: any) {
      toast({
        title: "❌ Ralat",
        description: error.message || "Gagal memuat naik logo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Club Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Club Settings</CardTitle>
          <CardDescription>Manage your club&apos;s basic information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="clubName">Club Name</Label>
            <Input
              id="clubName"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="Enter club name"
              disabled={loading}
            />
          </div>

          <div className="space-y-4">
            <Label>Club Logo</Label>
            {logoPreview && (
              <div className="relative w-40 h-40 border rounded-lg overflow-hidden">
                <img
                  src={logoPreview}
                  alt="Club Logo"
                  className="w-full h-full object-contain"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={handleDeleteLogo}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                disabled={loading || uploading}
              />
              <p className="text-sm text-muted-foreground mt-2">
                Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
              </p>
            </div>
          </div>

          <Button onClick={handleSaveClubSettings} disabled={loading || uploading}>
            {loading || uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploading ? "Uploading..." : "Saving..."}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Save Club Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* FiveFive Prize Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>FiveFive Prize Settings</CardTitle>
          <CardDescription>
            Configure prize distributions for different player counts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              How It Works
            </h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• Create configurations for different player counts (e.g., 1 player, 2 players, 10 players)</p>
              <p>• Set how many prizes to distribute for each player count</p>
              <p>• Enter prize amounts for each rank position</p>
              <p>• System will use the matching configuration during FiveFive games</p>
            </div>
          </div>

          {/* Configurations List */}
          {loadingConfigs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : fivefiveConfigs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No configurations yet. Click &quot;Add Configuration&quot; to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fivefiveConfigs.map((config) => (
                <div
                  key={config.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-semibold text-gray-900">
                          {config.player_count} Player{config.player_count > 1 ? "s" : ""}
                        </span>
                        <span className="text-gray-500">|</span>
                        <span className="text-gray-700">
                          {config.prize_count} Prize{config.prize_count > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {config.prizes.map((prize, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium"
                          >
                            #{idx + 1}: RM {prize.toFixed(2)}
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500">
                        Total Prize Pool: RM{" "}
                        {config.prizes.reduce((sum, p) => sum + p, 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditConfigDialog(config)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setConfigToDelete(config.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Configuration Button */}
          <Button onClick={openAddConfigDialog} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Add/Edit Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? "Edit" : "Add"} FiveFive Configuration
            </DialogTitle>
            <DialogDescription>
              Configure prize distribution for a specific player count
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Player Count & Prize Count */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="playerCount">Number of Players</Label>
                <Input
                  id="playerCount"
                  type="number"
                  min="1"
                  max="50"
                  value={dialogPlayerCount}
                  onChange={(e) => setDialogPlayerCount(parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground">
                  Total players in this configuration
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prizeCount">Number of Prizes</Label>
                <Input
                  id="prizeCount"
                  type="number"
                  min="1"
                  max={dialogPlayerCount}
                  value={dialogPrizeCount}
                  onChange={(e) => handlePrizeCountChange(parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground">
                  Creates {dialogPrizeCount} input box{dialogPrizeCount > 1 ? "es" : ""}
                </p>
              </div>
            </div>

            {/* Prize Amounts */}
            <div className="space-y-3">
              <Label>Prize Amounts (RM)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Array.from({ length: dialogPrizeCount }).map((_, index) => (
                  <div key={index} className="space-y-1">
                    <label className="text-xs text-gray-600 font-medium">
                      Prize #{index + 1}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        RM
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={dialogPrizes[index] || 0}
                        onChange={(e) => handlePrizeChange(index, e.target.value)}
                        className="pl-12"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Players</p>
                  <p className="font-semibold text-gray-900">{dialogPlayerCount}</p>
                </div>
                <div>
                  <p className="text-gray-600">Prizes</p>
                  <p className="font-semibold text-gray-900">{dialogPrizeCount}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Pool</p>
                  <p className="font-semibold text-red-600">
                    RM {dialogPrizes.reduce((sum, prize) => sum + prize, 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Per Player Avg</p>
                  <p className="font-semibold text-gray-900">
                    RM{" "}
                    {(
                      dialogPrizes.reduce((sum, prize) => sum + prize, 0) /
                      dialogPlayerCount
                    ).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig} disabled={savingConfig}>
              {savingConfig ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the prize
              configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfig} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}