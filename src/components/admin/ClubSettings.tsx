import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Upload, AlertCircle, Users, Settings, ChevronDown, GripVertical } from "lucide-react";
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
import { navLayoutService, type NavigationSettings, type NavPosition } from "@/services/navLayoutService";

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

type ClubSettingsTab =
  | "general"
  | "cache"
  | "security"
  | "handicap"
  | "statistics"
  | "push"
  | "layout";

type TabDef = {
  value: ClubSettingsTab;
  label: string;
};

const PRIMARY_TABS: TabDef[] = [
  { value: "general", label: "General" },
  { value: "cache", label: "Cache" },
  { value: "security", label: "Security" },
];

const MORE_TABS: TabDef[] = [
  { value: "handicap", label: "Handicap" },
  { value: "statistics", label: "Statistics" },
  { value: "push", label: "Push Message" },
  { value: "layout", label: "Layout" },
];

function isMoreTab(value: string): value is ClubSettingsTab {
  return MORE_TABS.some((t) => t.value === value);
}

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
  const [cacheDuration, setCacheDuration] = useState("3600");
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    totalConfigs: 0,
  });

  const [pageAccessList, setPageAccessList] = useState<PageAccessControl[]>([]);
  const [loadingPageAccess, setLoadingPageAccess] = useState(false);

  const [navSettings, setNavSettings] = useState<NavigationSettings>(navLayoutService.DEFAULT_NAV_SETTINGS);
  const [savingNav, setSavingNav] = useState(false);

  const [activeTab, setActiveTab] = useState<ClubSettingsTab>("general");

  const moreTabLabel = useMemo(() => {
    const def = MORE_TABS.find((t) => t.value === activeTab);
    return def?.label || "More";
  }, [activeTab]);

  useEffect(() => {
    loadSettings();
    loadFiveFiveConfigs();
    loadCacheSetting();
    loadStats();
    loadPageAccessSettings();
    loadNavigationSettings();
  }, []);

  const loadNavigationSettings = async () => {
    try {
      const settings = await navLayoutService.getNavigationSettings();
      setNavSettings(settings);
    } catch (error) {
      console.error("Error loading nav settings:", error);
    }
  };

  const handleSaveNavSettings = async () => {
    setSavingNav(true);
    try {
      await navLayoutService.setNavigationSettings(navSettings);
      
      // Dispatch an event to update navigation across the app without reloading
      window.dispatchEvent(
        new CustomEvent("nav-settings-updated", {
          detail: { settings: navSettings },
        })
      );
      
      toast({
        title: "✅ Berjaya!",
        description: "Tetapan navigasi telah disimpan.",
      });
    } catch (error: any) {
      toast({
        title: "❌ Ralat",
        description: error.message || "Gagal menyimpan tetapan navigasi",
        variant: "destructive",
      });
    } finally {
      setSavingNav(false);
    }
  };

  const loadStats = async () => {
    try {
      const { count: totalMembers } = await supabase.from("members").select("*", { count: "exact", head: true });

      const { count: totalConfigs } = await supabase.from("fivefive_prizes").select("*", { count: "exact", head: true });

      setStats({
        totalMembers: totalMembers || 0,
        activeMembers: totalMembers || 0,
        totalConfigs: totalConfigs || 0,
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

      setPageAccessList((prev) => prev.map((page) => (page.id === pageId ? { ...page, access_level: newLevel } : page)));

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

      setPageAccessList((prev) => prev.map((page) => (page.id === pageId ? { ...page, is_enabled: isEnabled } : page)));

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
      const { data, error } = await supabase
        .from("club_settings")
        .update({ setting_value: enabled ? "true" : "false" })
        .eq("setting_key", "enable_cache")
        .select()
        .maybeSingle();

      if (error) throw error;

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
        value === "0"
          ? "disabled"
          : days >= 1
            ? `${days} day${days > 1 ? "s" : ""}`
            : hours >= 1
              ? `${hours} hour${hours > 1 ? "s" : ""}`
              : `${value} seconds`;

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
      const { data } = await supabase.from("club_settings").select("setting_key, setting_value");

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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "❌ Ralat",
          description: "Sila log masuk semula",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data: memberData } = await supabase.from("members").select("is_admin").eq("user_id", session.user.id).single();

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
        const { data: existing } = await supabase.from("club_settings").select("id").eq("setting_key", setting.setting_key).maybeSingle();

        if (existing) {
          const { error } = await supabase.from("club_settings").update({ setting_value: setting.setting_value }).eq("id", existing.id);

          if (error) throw error;
        } else {
          const { error } = await supabase.from("club_settings").insert(setting);
          if (error) throw error;
        }
      }

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

    if (!["image/jpeg", "image/jpg", "image/png", "image/gif"].includes(file.type)) {
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "❌ Ralat",
          description: "Sila log masuk semula",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data: memberData } = await supabase.from("members").select("is_admin").eq("user_id", session.user.id).single();

      if (!memberData?.is_admin) {
        toast({
          title: "❌ Ralat",
          description: "Hanya admin boleh memadam logo kelab",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data: existing } = await supabase.from("club_settings").select("id").eq("setting_key", "club_logo_base64").maybeSingle();

      if (existing) {
        const { error } = await supabase.from("club_settings").update({ setting_value: "" }).eq("id", existing.id);

        if (error) throw error;
      }

      setLogoBase64("");

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
      const { data, error } = await supabase.from("fivefive_prizes").select("*").order("player_count", { ascending: true });

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
      const duplicate = fivefiveConfigs.find((c) => c.player_count === dialogPlayerCount && c.id !== editingConfig?.id);
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
        const { error } = await supabase.from("fivefive_prizes").update(configData).eq("id", editingConfig.id);

        if (error) throw error;

        toast({
          title: "✅ Berjaya!",
          description: `Configuration untuk ${dialogPlayerCount} pemain telah dikemaskini.`,
        });
      } else {
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

  const openDeleteDialog = (configId: string) => {
    setConfigToDelete(configId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfig = async () => {
    try {
      if (!configToDelete) return;

      const configToDeleteData = fivefiveConfigs.find((c) => c.id === configToDelete);

      const { error } = await supabase.from("fivefive_prizes").delete().eq("id", configToDelete);

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

  const handleMoreTabChange = (value: string) => {
    if (value === "__more__") return;
    if (isMoreTab(value)) setActiveTab(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Club Settings</h1>
        <p className="text-muted-foreground">Manage your club configurations and settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ClubSettingsTab)} className="space-y-6">
        <div className="flex items-center gap-2">
          <TabsList className="flex-1">
            {PRIMARY_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="shrink-0 sm:hidden">
            <Select value={MORE_TABS.find((t) => t.value === activeTab)?.value ?? "__more__"} onValueChange={handleMoreTabChange}>
              <SelectTrigger className="h-10 w-[140px]">
                <SelectValue placeholder="More" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__more__" disabled>
                  <span className="flex items-center gap-2">
                    More <ChevronDown className="h-4 w-4" />
                  </span>
                </SelectItem>
                {MORE_TABS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="hidden sm:flex">
            <TabsList>
              {MORE_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Club Settings</CardTitle>
              <p className="text-sm text-muted-foreground">Manage your club&apos;s basic information</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="club-name">Club Name</Label>
                <Input id="club-name" value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="Enter club name" />
              </div>

              <div className="space-y-2">
                <Label>Club Logo</Label>
                <div className="flex flex-col gap-4">
                  {logoBase64 && (
                    <div className="relative h-40 w-40 overflow-hidden rounded-lg border bg-gray-50">
                      <img src={logoBase64} alt="Club Logo" className="h-full w-full object-contain" />
                      <Button variant="destructive" size="icon" className="absolute right-2 top-2" onClick={handleDeleteLogo} disabled={loading}>
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
                  <p className="text-sm text-muted-foreground">Maximum file size: 5MB. Supported formats: JPG, PNG, GIF</p>
                </div>
              </div>

              <Button onClick={saveClubSettings} disabled={loading}>
                {loading ? "Saving..." : "Save Club Settings"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">🏆 FiveFive Prize Settings</CardTitle>
              <p className="text-sm text-muted-foreground">Configure prize distributions for different player counts</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="mb-2 font-medium text-blue-900">ℹ️ How It Works</h4>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>• Create configurations for different player counts</li>
                  <li>• Set how many prizes to distribute for each player count</li>
                  <li>• Enter prize amounts for each rank position</li>
                  <li>• System will use the matching configuration during games</li>
                </ul>
              </div>

              {fivefiveConfigs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p>Tiada konfigurasi lagi. Klik butang di bawah untuk tambah.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fivefiveConfigs.map((config) => (
                    <div key={config.id} className="rounded-lg border p-4 transition-colors hover:bg-gray-50">
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <h4 className="text-lg font-semibold">
                            {config.player_count} Player{config.player_count > 1 ? "s" : ""}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {config.prize_count} Prize{config.prize_count > 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditConfigDialog(config)}>
                            Edit
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(config.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>

                      <div className="mb-2 flex flex-wrap gap-2">
                        {config.prizes.map((prize, idx) => (
                          <div key={idx} className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
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
                <Upload className="mr-2 h-4 w-4" />
                Add Configuration
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">🔄 Cache Control</CardTitle>
              <p className="text-sm text-muted-foreground">Manage cache settings for the club</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="mb-2 font-medium text-blue-900">ℹ️ How It Works</h4>
                <ul className="space-y-1 text-sm text-blue-800">
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
                  className="mt-2 h-auto w-auto"
                />
                <p className="text-xs text-muted-foreground">Turn off caching temporarily to force fresh data loads if you are experiencing issues.</p>
              </div>
            </CardContent>
          </Card>

          <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingConfig ? "Edit" : "Add"} FiveFive Configuration</DialogTitle>
                <DialogDescription>Set up prize distribution for a specific player count</DialogDescription>
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
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {dialogPrizes.map((prize, index) => (
                      <div key={index} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Prize #{index + 1}</Label>
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

                <div className="rounded-lg border bg-gray-50 p-4">
                  <h4 className="mb-2 font-medium">Summary</h4>
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
                  <div className="mt-2 border-t pt-2">
                    <p className="text-xs text-muted-foreground">Per Player Avg: RM {avgPrizePerPlayer.toFixed(2)}</p>
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
                <AlertDialogDescription>This will permanently delete the prize configuration. This action cannot be undone.</AlertDialogDescription>
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

        <TabsContent value="cache" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cache Control</CardTitle>
              <CardDescription>Configure caching behavior for uploaded images and assets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-4">
                <div className="space-y-1">
                  <Label htmlFor="cache-enable-switch" className="text-base font-semibold">
                    Enable Cache
                  </Label>
                  <p className="text-sm text-muted-foreground">Store uploaded images in browser cache for faster loading</p>
                </div>
                <Switch id="cache-enable-switch" checked={enableCache} onCheckedChange={handleCacheToggle} />
              </div>

              {enableCache && (
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-1">
                    <Label htmlFor="cache-duration" className="text-base font-semibold">
                      Cache Duration
                    </Label>
                    <p className="text-sm text-muted-foreground">How long images should be cached in the browser</p>
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

                  <div className="space-y-2 rounded-lg bg-muted p-4">
                    <p className="text-sm font-medium">Current Setting:</p>
                    <p className="text-sm text-muted-foreground">
                      {cacheDuration === "0" ? (
                        "Cache is disabled - images will always load fresh from server"
                      ) : (
                        <>
                          Images will be cached for{" "}
                          <span className="font-semibold">
                            {parseInt(cacheDuration) >= 86400
                              ? `${parseInt(cacheDuration) / 86400} day${parseInt(cacheDuration) / 86400 > 1 ? "s" : ""}`
                              : parseInt(cacheDuration) >= 3600
                                ? `${parseInt(cacheDuration) / 3600} hour${parseInt(cacheDuration) / 3600 > 1 ? "s" : ""}`
                                : `${parseInt(cacheDuration) / 60} minutes`}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-500" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Cache Duration Recommendations</p>
                        <ul className="ml-4 list-disc space-y-1 text-sm text-amber-800 dark:text-amber-300">
                          <li>
                            <strong>1 Hour:</strong> Best for most cases - balances performance and freshness
                          </li>
                          <li>
                            <strong>6-24 Hours:</strong> Good for stable content that rarely changes
                          </li>
                          <li>
                            <strong>7+ Days:</strong> Only for truly static images (logos, backgrounds)
                          </li>
                          <li>
                            <strong>No Cache:</strong> Use only when debugging upload issues
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!enableCache && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-500" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Cache Disabled</p>
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        Images will always load fresh from the server. This may result in slower page loads and increased bandwidth usage. Enable cache for
                        better performance.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Page Access Control</CardTitle>
              <CardDescription>Manage access permissions for all member pages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="mb-2 font-medium text-blue-900">ℹ️ Access Levels</h4>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>
                    • <strong>Public:</strong> Semua orang boleh akses (Guest, Member, Admin)
                  </li>
                  <li>
                    • <strong>Member:</strong> Member dan Admin sahaja boleh akses
                  </li>
                  <li>
                    • <strong>Admin:</strong> Admin sahaja boleh akses
                  </li>
                </ul>
              </div>

              {loadingPageAccess ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p>Memuatkan tetapan page access...</p>
                </div>
              ) : pageAccessList.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p>Tiada page access settings dijumpai</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pageAccessList.map((page) => (
                    <div
                      key={page.id}
                      className={`rounded-lg border p-4 transition-colors ${page.is_enabled ? "bg-white" : "bg-gray-50 opacity-60"}`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-3">
                            <h4 className="text-base font-semibold">{page.page_name}</h4>
                            {!page.is_enabled && (
                              <span className="rounded-full bg-gray-200 px-2 py-1 text-xs text-gray-600">Disabled</span>
                            )}
                          </div>
                          <p className="font-mono text-sm text-muted-foreground">{page.page_path}</p>
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
                                  <span className="flex items-center gap-2">🌐 Public</span>
                                </SelectItem>
                                <SelectItem value="member">
                                  <span className="flex items-center gap-2">🔒 Member</span>
                                </SelectItem>
                                <SelectItem value="admin">
                                  <span className="flex items-center gap-2">👑 Admin</span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <Label htmlFor={`enabled-${page.id}`} className="text-xs text-muted-foreground">
                              Enable
                            </Label>
                            <Switch id={`enabled-${page.id}`} checked={page.is_enabled} onCheckedChange={(checked) => handlePageToggle(page.id, checked)} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 border-t pt-2 text-xs text-muted-foreground">
                        <span>Current Access:</span>
                        {page.access_level === "public" && (
                          <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">🌐 Semua orang</span>
                        )}
                        {page.access_level === "member" && (
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800">🔒 Member + Admin</span>
                        )}
                        {page.access_level === "admin" && (
                          <span className="rounded bg-purple-100 px-2 py-0.5 text-purple-800">👑 Admin sahaja</span>
                        )}
                        {!page.is_enabled && <span className="rounded bg-gray-200 px-2 py-0.5 text-gray-600">⛔ Disabled</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="handicap" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Handicap Management</CardTitle>
              <CardDescription>Configure handicap calculation settings for your club</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Handicap management features will be available here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Club Statistics</CardTitle>
              <CardDescription>Overview of your club&apos;s activity and member statistics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Total Members</p>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-2 text-2xl font-bold">{stats.totalMembers}</p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Active Members</p>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-2 text-2xl font-bold">{stats.activeMembers}</p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Total Configurations</p>
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-2 text-2xl font-bold">{stats.totalConfigs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="push" className="space-y-6">
          <PushMessagePanel />
        </TabsContent>

        <TabsContent value="layout" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Navigation Layout</CardTitle>
              <CardDescription>Configure navigation layout settings for member pages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                <h4 className="mb-2 font-medium text-blue-900 dark:text-blue-200">ℹ️ Layout Options</h4>
                <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
                  <li>• Configure navigation bar position (top/bottom)</li>
                  <li>• Customize navigation style and behavior</li>
                  <li>• Set default layout preferences for members</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
                  <div className="space-y-1">
                    <Label htmlFor="nav-position" className="text-base font-semibold">
                      Navigation Position
                    </Label>
                    <p className="text-sm text-muted-foreground">Choose where navigation bar appears for members</p>
                  </div>
                  <Select 
                    value={navSettings.position} 
                    onValueChange={(val: NavPosition) => setNavSettings(prev => ({ ...prev, position: val }))}
                  >
                    <SelectTrigger id="nav-position" className="w-[180px]">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top Bar</SelectItem>
                      <SelectItem value="bottom">Bottom Bar (Mobile)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
                  <div className="space-y-1">
                    <Label htmlFor="fixed-nav" className="text-base font-semibold">
                      Fixed Navigation
                    </Label>
                    <p className="text-sm text-muted-foreground">Keep navigation visible when scrolling</p>
                  </div>
                  <Switch 
                    id="fixed-nav" 
                    checked={navSettings.isFixed}
                    onCheckedChange={(checked) => setNavSettings(prev => ({ ...prev, isFixed: checked }))} 
                  />
                </div>

                <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
                  <div className="space-y-1">
                    <Label htmlFor="compact-nav" className="text-base font-semibold">
                      Compact Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">Use smaller navigation icons and labels</p>
                  </div>
                  <Switch 
                    id="compact-nav" 
                    checked={navSettings.isCompact}
                    onCheckedChange={(checked) => setNavSettings(prev => ({ ...prev, isCompact: checked }))}
                  />
                </div>

                <Button onClick={handleSaveNavSettings} disabled={savingNav} className="w-full">
                  {savingNav ? "Menyimpan..." : "Save Layout Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
    </div>
  );
}