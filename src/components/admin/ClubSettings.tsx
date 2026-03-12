import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Upload, AlertCircle, Users, Settings } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pageAccessService, type AccessLevel } from "@/services/pageAccessService";
import { PushMessagePanel } from "@/components/admin/PushMessagePanel";

type FiveFivePrizeConfig = {
  id: string;
  player_count: number;
  prize_count: number;
  prizes: number[];
};

type PageAccessControl = {
  id: string;
  page_path: string;
  page_name: string;
  access_level: AccessLevel;
  is_enabled: boolean;
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
  const [enableCache, setEnableCache] = useState(true);
  const [cacheDuration, setCacheDuration] = useState("3600"); // Default 1 hour in seconds
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    totalConfigs: 0
  });

  // Page Access Control states
  const [pageAccessList, setPageAccessList] = useState<PageAccessControl[]>([]);
  const [loadingPageAccess, setLoadingPageAccess] = useState(false);

  useEffect(() => {
    loadSettings();
    loadFiveFiveConfigs();
    loadCacheSetting();
    loadStats();
    loadPageAccessSettings();
  }, []);

  const loadStats = async () => {
    try {
      const { count: totalMembers } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true });
        
      const { count: totalConfigs } = await supabase
        .from("fivefive_prizes")
        .select("*", { count: "exact", head: true });
        
      setStats({
        totalMembers: totalMembers || 0,
        activeMembers: totalMembers || 0,
        totalConfigs: totalConfigs || 0
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadPageAccessSettings = async () => {
    setLoadingPageAccess(true);
    try {
      const pages = await pageAccessService.getAllPageAccess();
      setPageAccessList(pages as PageAccessControl[]);
    } catch (error: any) {
      toast({
        title: "❌ Ralat",
        description: error.message || "Gagal memuatkan tetapan page access",
        variant: "destructive",
      });
    } finally {
      setLoadingPageAccess(false);
    }
  };

  const handleAccessLevelChange = async (pageId: string, newLevel: AccessLevel) => {
    try {
      await pageAccessService.updatePageAccess(pageId, { access_level: newLevel });
      
      setPageAccessList(prev =>
        prev.map(page =>
          page.id === pageId ? { ...page, access_level: newLevel } : page
        )
      );

      toast({
        title: "✅ Berjaya!",
        description: "Access level telah dikemaskini",
      });
    } catch (error: any) {
      toast({
        title: "❌ Ralat",
        description: error.message || "Gagal mengemas kini access level",
        variant: "destructive",
      });
    }
  };

  const handlePageToggle = async (pageId: string, isEnabled: boolean) => {
    try {
      await pageAccessService.togglePageEnabled(pageId, isEnabled);
      
      setPageAccessList(prev =>
        prev.map(page =>
          page.id === pageId ? { ...page, is_enabled: isEnabled } : page
        )
      );

      toast({
        title: "✅ Berjaya!",
        description: `Page telah ${isEnabled ? "diaktifkan" : "dinyahaktifkan"}`,
      });
    } catch (error: any) {
      toast({
        title: "❌ Ralat",
        description: error.message || "Gagal mengemas kini status page",
        variant: "destructive",
      });
    }
  };

  const loadCacheSetting = async () => {
    try {
      const { data } = await supabase
        .from("club_settings")
        .select("setting_value")
        .eq("setting_key", "enable_cache")
        .single();

      if (data) {
        setEnableCache(data.setting_value === "true");
      }

      // Load cache duration
      const { data: durationData } = await supabase
        .from("club_settings")
        .select("setting_value")
        .eq("setting_key", "cache_duration")
        .single();

      if (durationData?.setting_value) {
        setCacheDuration(durationData.setting_value);
      }
    } catch (error) {
      console.error("Error loading cache setting:", error);
    }
  };

  const handleCacheToggle = async (enabled: boolean) => {
    try {
      // First try to update
      const { data, error } = await supabase
        .from("club_settings")
        .update({ setting_value: enabled ? "true" : "false" })
        .eq("setting_key", "enable_cache")
        .select()
        .maybeSingle();

      if (error) throw error;
      
      // If it didn't exist, insert it
      if (!data) {
        const { error: insertError } = await supabase
          .from("club_settings")
          .insert({ setting_key: "enable_cache", setting_value: enabled ? "true" : "false" });
          
        if (insertError) throw insertError;
      }

      setEnableCache(enabled);
      toast({
        title: "✅ Berjaya!",
        description: `Tetapan cache telah dikemaskini ke ${enabled ? "dihidupkan" : "dimatikan"}.`,
      });
    } catch (error: any) {
      toast({
        title: "❌ Ralat",
        description: error.message || "Gagal mengemaskini tetapan cache.",
        variant: "destructive",
      });
    }
  };

  const handleCacheDurationChange = async (value: string) => {
    try {
      setCacheDuration(value);

      await supabase.from("club_settings").upsert({
        setting_key: "cache_duration",
        setting_value: value,
      });

      const hours = parseInt(value) / 3600;
      const days = hours / 24;
      const displayValue = 
        value === "0" ? "disabled" :
        days >= 1 ? `${days} day${days > 1 ? 's' : ''}` :
        hours >= 1 ? `${hours} hour${hours > 1 ? 's' : ''}` :
        `${value} seconds`;

      toast({
        title: "Success",
        description: `Cache duration set to ${displayValue}`,
      });
    } catch (error) {
      console.error("Error updating cache duration:", error);
      toast({
        title: "Error",
        description: "Failed to update cache duration",
        variant: "destructive",
      });
    }
  };

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
      <div>
        <h1 className="text-3xl font-bold">Club Settings</h1>
        <p className="text-muted-foreground">
          Manage your club configurations and settings
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="handicap">Handicap</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="push">Push Message</TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
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

          {/* Cache Control Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🔄 Cache Control
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage cache settings for the club
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">ℹ️ How It Works</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Enable or disable cache to control data freshness</li>
                  <li>• Cache is used to speed up data retrieval</li>
                  <li>• Disable cache to force data refresh</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cache-enable">Enable Cache</Label>
                <Input
                  id="cache-enable"
                  type="checkbox"
                  checked={enableCache}
                  onChange={(e) => handleCacheToggle(e.target.checked)}
                  className="w-auto h-auto mt-2"
                />
                <p className="text-xs text-muted-foreground">
                  Turn off caching temporarily to force fresh data loads if you are experiencing issues.
                </p>
              </div>
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
        </TabsContent>

        {/* Cache Settings Tab */}
        <TabsContent value="cache" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cache Control</CardTitle>
              <CardDescription>
                Configure caching behavior for uploaded images and assets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Cache */}
              <div className="flex items-center justify-between space-x-4">
                <div className="space-y-1">
                  <Label htmlFor="cache-enable" className="text-base font-semibold">
                    Enable Cache
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Store uploaded images in browser cache for faster loading
                  </p>
                </div>
                <Switch
                  id="cache-enable"
                  checked={enableCache}
                  onCheckedChange={handleCacheToggle}
                />
              </div>

              {/* Cache Duration */}
              {enableCache && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-1">
                    <Label htmlFor="cache-duration" className="text-base font-semibold">
                      Cache Duration
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      How long images should be cached in the browser
                    </p>
                  </div>
                  
                  <Select value={cacheDuration} onValueChange={handleCacheDurationChange}>
                    <SelectTrigger id="cache-duration">
                      <SelectValue placeholder="Select cache duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No Cache (Always Fresh)</SelectItem>
                      <SelectItem value="1800">30 Minutes</SelectItem>
                      <SelectItem value="3600">1 Hour (Recommended)</SelectItem>
                      <SelectItem value="21600">6 Hours</SelectItem>
                      <SelectItem value="86400">24 Hours (1 Day)</SelectItem>
                      <SelectItem value="604800">7 Days (1 Week)</SelectItem>
                      <SelectItem value="2592000">30 Days (1 Month)</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="rounded-lg bg-muted p-4 space-y-2">
                    <p className="text-sm font-medium">Current Setting:</p>
                    <p className="text-sm text-muted-foreground">
                      {cacheDuration === "0" ? (
                        "Cache is disabled - images will always load fresh from server"
                      ) : (
                        <>
                          Images will be cached for{" "}
                          <span className="font-semibold">
                            {parseInt(cacheDuration) >= 86400
                              ? `${parseInt(cacheDuration) / 86400} day${parseInt(cacheDuration) / 86400 > 1 ? 's' : ''}`
                              : parseInt(cacheDuration) >= 3600
                              ? `${parseInt(cacheDuration) / 3600} hour${parseInt(cacheDuration) / 3600 > 1 ? 's' : ''}`
                              : `${parseInt(cacheDuration) / 60} minutes`}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                          Cache Duration Recommendations
                        </p>
                        <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1 ml-4 list-disc">
                          <li><strong>1 Hour:</strong> Best for most cases - balances performance and freshness</li>
                          <li><strong>6-24 Hours:</strong> Good for stable content that rarely changes</li>
                          <li><strong>7+ Days:</strong> Only for truly static images (logos, backgrounds)</li>
                          <li><strong>No Cache:</strong> Use only when debugging upload issues</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!enableCache && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                        Cache Disabled
                      </p>
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        Images will always load fresh from the server. This may result in slower page loads and increased bandwidth usage. Enable cache for better performance.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Page Access Control</CardTitle>
              <CardDescription>
                Manage access permissions for all member pages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">ℹ️ Access Levels</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Public:</strong> Semua orang boleh akses (Guest, Member, Admin)</li>
                  <li>• <strong>Member:</strong> Member dan Admin sahaja boleh akses</li>
                  <li>• <strong>Admin:</strong> Admin sahaja boleh akses</li>
                </ul>
              </div>

              {loadingPageAccess ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Memuatkan tetapan page access...</p>
                </div>
              ) : pageAccessList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Tiada page access settings dijumpai</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pageAccessList.map((page) => (
                    <div
                      key={page.id}
                      className={`border rounded-lg p-4 transition-colors ${
                        page.is_enabled ? "bg-white" : "bg-gray-50 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-semibold text-base">{page.page_name}</h4>
                            {!page.is_enabled && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                                Disabled
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground font-mono">
                            {page.page_path}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end gap-1">
                            <Label htmlFor={`access-${page.id}`} className="text-xs text-muted-foreground">
                              Access Level
                            </Label>
                            <Select
                              value={page.access_level}
                              onValueChange={(value: AccessLevel) => handleAccessLevelChange(page.id, value)}
                              disabled={!page.is_enabled}
                            >
                              <SelectTrigger id={`access-${page.id}`} className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="public">
                                  <span className="flex items-center gap-2">
                                    🌐 Public
                                  </span>
                                </SelectItem>
                                <SelectItem value="member">
                                  <span className="flex items-center gap-2">
                                    🔒 Member
                                  </span>
                                </SelectItem>
                                <SelectItem value="admin">
                                  <span className="flex items-center gap-2">
                                    👑 Admin
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <Label htmlFor={`enabled-${page.id}`} className="text-xs text-muted-foreground">
                              Enable
                            </Label>
                            <Switch
                              id={`enabled-${page.id}`}
                              checked={page.is_enabled}
                              onCheckedChange={(checked) => handlePageToggle(page.id, checked)}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                        <span>Current Access:</span>
                        {page.access_level === "public" && (
                          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            🌐 Semua orang
                          </span>
                        )}
                        {page.access_level === "member" && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            🔒 Member + Admin
                          </span>
                        )}
                        {page.access_level === "admin" && (
                          <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                            👑 Admin sahaja
                          </span>
                        )}
                        {!page.is_enabled && (
                          <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                            ⛔ Disabled
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Handicap Settings Tab */}
        <TabsContent value="handicap" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Handicap Management</CardTitle>
              <CardDescription>
                Configure handicap calculation settings for your club
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Handicap management features will be available here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Club Statistics</CardTitle>
              <CardDescription>
                Overview of your club's activity and member statistics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Members
                    </p>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold mt-2">{stats.totalMembers}</p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">
                      Active Members
                    </p>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold mt-2">{stats.activeMembers}</p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Configurations
                    </p>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold mt-2">{stats.totalConfigs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="push" className="space-y-6">
          <PushMessagePanel />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
    </div>
  );
}