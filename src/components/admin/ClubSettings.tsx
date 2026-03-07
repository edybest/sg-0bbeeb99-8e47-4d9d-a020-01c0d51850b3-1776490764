import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [clubName, setClubName] = useState("");
  const [logoBase64, setLogoBase64] = useState("");

  const [fivefiveConfigs, setFivefiveConfigs] = useState<FiveFivePrizeConfig[]>([]);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<FiveFivePrizeConfig | null>(null);
  const [dialogPlayerCount, setDialogPlayerCount] = useState(1);
  const [dialogPrizeCount, setDialogPrizeCount] = useState(1);
  const [dialogPrizes, setDialogPrizes] = useState<number[]>([100]);
  const [savingConfig, setSavingConfig] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadFiveFiveConfigs();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("club_settings")
        .select("setting_key, setting_value");

      if (data) {
        const nameRow = data.find((row) => row.setting_key === "club_name");
        const logoRow = data.find((row) => row.setting_key === "club_logo_base64");

        if (nameRow) setClubName(nameRow.setting_value || "");
        if (logoRow) setLogoBase64(logoRow.setting_value || "");
      }
    } catch (error: any) {
      toast({
        title: "❌ Ralat",
        description: error.message || "Gagal memuatkan tetapan.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveClubSettings = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "❌ Ralat",
          description: "Sila log masuk semula",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data: memberData } = await supabase
        .from("members")
        .select("is_admin")
        .eq("user_id", session.user.id)
        .single();

      if (!memberData?.is_admin) {
        toast({
          title: "❌ Ralat",
          description: "Hanya admin boleh mengubah tetapan kelab",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const settings = [
        { setting_key: "club_name", setting_value: clubName },
        { setting_key: "club_logo_base64", setting_value: logoBase64 },
      ];

      for (const setting of settings) {
        const { data: existing } = await supabase
          .from("club_settings")
          .select("id")
          .eq("setting_key", setting.setting_key)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from("club_settings")
            .update({ setting_value: setting.setting_value })
            .eq("id", existing.id);

          if (error) throw error;
        } else {
          const { error } = await supabase.from("club_settings").insert(setting);
          if (error) throw error;
        }
      }

      console.log("ClubSettings: Dispatching logo-updated event with base64 length:", logoBase64.length);
      
      window.dispatchEvent(
        new CustomEvent("logo-updated", {
          detail: { logoBase64 },
        })
      );

      toast({
        title: "✅ Berjaya!",
        description: "Tetapan kelab telah dikemaskini.",
      });
    } catch (error: any) {
      toast({
        title: "❌ Ralat",
        description: error.message || "Gagal menyimpan tetapan.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "❌ Ralat",
        description: "Saiz fail terlalu besar. Maksimum 5MB.",
        variant: "destructive",
      });
      return;
    }

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "❌ Ralat",
        description: "Format fail tidak disokong. Gunakan JPG, PNG atau GIF.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setLogoBase64(base64String);
      setUploading(false);

      toast({
        title: "✅ Berjaya!",
        description: "Logo telah dipilih. Klik 'Save Club Settings' untuk simpan.",
      });
    };
    reader.onerror = () => {
      setUploading(false);
      toast({
        title: "❌ Ralat",
        description: "Gagal membaca fail.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteLogo = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "❌ Ralat",
          description: "Sila log masuk semula",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data: memberData } = await supabase
        .from("members")
        .select("is_admin")
        .eq("user_id", session.user.id)
        .single();

      if (!memberData?.is_admin) {
        toast({
          title: "❌ Ralat",
          description: "Hanya admin boleh memadam logo kelab",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data: existing } = await supabase
        .from("club_settings")
        .select("id")
        .eq("setting_key", "club_logo_base64")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("club_settings")
          .update({ setting_value: "" })
          .eq("id", existing.id);

        if (error) throw error;
      }

      setLogoBase64("");

      console.log("ClubSettings: Dispatching logo-updated event for logo deletion");
      
      window.dispatchEvent(
        new CustomEvent("logo-updated", {
          detail: { logoBase64: "" },
        })
      );

      toast({
        title: "✅ Berjaya!",
        description: "Logo kelab telah dipadam.",
      });
    } catch (error: any) {
      toast({
        title: "❌ Ralat",
        description: error.message || "Gagal memadam logo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFiveFiveConfigs = async () => {
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
          prizes: Array.isArray(config.prizes)
            ? config.prizes.map(Number)
            : [],
        }));
        setFivefiveConfigs(configs);
      }
    } catch (error: any) {
      toast({
        title: "❌ Ralat",
        description: error.message || "Gagal memuatkan konfigurasi FiveFive.",
        variant: "destructive",
      });
    }
  };

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
        newPrizes.push(
          Math.max(10, lastPrize - 20 * (i - newPrizes.length + 1))
        );
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
    if (dialogPlayerCount <= 0 || dialogPlayerCount > 50) {
      toast({
        title: "❌ Ralat",
        description: "Jumlah pemain mestilah antara 1 dan 50",
        variant: "destructive",
      });
      return;
    }

    if (dialogPrizeCount <= 0 || dialogPrizeCount > dialogPlayerCount) {
      toast({
        title: "❌ Ralat",
        description: "Jumlah hadiah mestilah antara 1 dan jumlah pemain",
        variant: "destructive",
      });
      return;
    }

    if (dialogPrizes.some((p) => p <= 0)) {
      toast({
        title: "❌ Ralat",
        description: "Semua hadiah mestilah lebih daripada 0",
        variant: "destructive",
      });
      return;
    }

    if (!editingConfig || editingConfig.player_count !== dialogPlayerCount) {
      const duplicate = fivefiveConfigs.find(
        (c) => c.player_count === dialogPlayerCount && c.id !== editingConfig?.id
      );
      if (duplicate) {
        toast({
          title: "❌ Ralat",
          description: `Configuration untuk ${dialogPlayerCount} pemain sudah wujud`,
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
        const { error } = await supabase
          .from("fivefive_prizes")
          .insert(configData);

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

  const openDeleteDialog = (configId: string) => {
    setConfigToDelete(configId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfig = async () => {
    try {
      if (!configToDelete) return;

      const configToDeleteData = fivefiveConfigs.find(
        (c) => c.id === configToDelete
      );

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

  const totalPrizePool = dialogPrizes.reduce((sum, prize) => sum + prize, 0);
  const avgPrizePerPlayer = dialogPlayerCount > 0 ? totalPrizePool / dialogPlayerCount : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Club Settings</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage your club&apos;s basic information
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="club-name">Club Name</Label>
            <Input
              id="club-name"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="Enter club name"
            />
          </div>

          <div className="space-y-2">
            <Label>Club Logo</Label>
            <div className="flex flex-col gap-4">
              {logoBase64 && (
                <div className="relative w-40 h-40 border rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={logoBase64}
                    alt="Club Logo"
                    className="w-full h-full object-contain"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleDeleteLogo}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif"
                  onChange={handleLogoChange}
                  disabled={uploading}
                  className="flex-1"
                />
                {uploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
              </div>
              <p className="text-sm text-muted-foreground">
                Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
              </p>
            </div>
          </div>

          <Button onClick={saveClubSettings} disabled={loading}>
            {loading ? "Saving..." : "Save Club Settings"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🏆 FiveFive Prize Settings
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure prize distributions for different player counts
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-blue-900 mb-2">ℹ️ How It Works</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Create configurations for different player counts</li>
              <li>• Set how many prizes to distribute for each player count</li>
              <li>• Enter prize amounts for each rank position</li>
              <li>• System will use the matching configuration during games</li>
            </ul>
          </div>

          {fivefiveConfigs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Tiada konfigurasi lagi. Klik butang di bawah untuk tambah.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fivefiveConfigs.map((config) => (
                <div
                  key={config.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">
                        {config.player_count} Player{config.player_count > 1 ? "s" : ""}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {config.prize_count} Prize{config.prize_count > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditConfigDialog(config)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDeleteDialog(config.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-2">
                    {config.prizes.map((prize, idx) => (
                      <div
                        key={idx}
                        className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        #{idx + 1}: RM {prize.toFixed(2)}
                      </div>
                    ))}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Total Prize Pool: RM {config.prizes.reduce((sum, p) => sum + p, 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button onClick={openAddConfigDialog} className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            Add Configuration
          </Button>
        </CardContent>
      </Card>

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? "Edit" : "Add"} FiveFive Configuration
            </DialogTitle>
            <DialogDescription>
              Set up prize distribution for a specific player count
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="player-count">Number of Players</Label>
                <Input
                  id="player-count"
                  type="number"
                  min={1}
                  max={50}
                  value={dialogPlayerCount}
                  onChange={(e) => setDialogPlayerCount(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prize-count">Number of Prizes</Label>
                <Input
                  id="prize-count"
                  type="number"
                  min={1}
                  max={dialogPlayerCount}
                  value={dialogPrizeCount}
                  onChange={(e) => handlePrizeCountChange(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prize Amounts (RM)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {dialogPrizes.map((prize, index) => (
                  <div key={index} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Prize #{index + 1}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={prize}
                      onChange={(e) => handlePrizeChange(index, e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 border rounded-lg p-4">
              <h4 className="font-medium mb-2">Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Players</p>
                  <p className="font-semibold">{dialogPlayerCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Prizes</p>
                  <p className="font-semibold">{dialogPrizeCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Pool</p>
                  <p className="font-semibold">RM {totalPrizePool.toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Per Player Avg: RM {avgPrizePerPlayer.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig} disabled={savingConfig}>
              {savingConfig ? "Saving..." : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the prize configuration. This action cannot be undone.
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