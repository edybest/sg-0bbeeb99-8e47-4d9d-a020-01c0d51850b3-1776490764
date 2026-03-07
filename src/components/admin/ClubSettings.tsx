import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Trash2, Plus, Minus } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type FiveFivePrize = Tables<"fivefive_prizes">;

export function ClubSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clubName, setClubName] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // FiveFive prizes state
  const [fivefivePrizes, setFivefivePrizes] = useState<FiveFivePrize[]>([]);
  const [loadingPrizes, setLoadingPrizes] = useState(false);
  const [savingPrizes, setSavingPrizes] = useState(false);

  useEffect(() => {
    loadSettings();
    loadFiveFivePrizes();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      // Load club name
      const { data: nameData } = await supabase
        .from("club_settings")
        .select("setting_value")
        .eq("setting_key", "club_name")
        .maybeSingle();

      if (nameData) {
        setClubName(nameData.setting_value);
      }

      // Load logo
      const { data: logoData } = await supabase
        .from("club_settings")
        .select("setting_value")
        .eq("setting_key", "logo_base64")
        .maybeSingle();

      if (logoData) {
        setLogoPreview(logoData.setting_value);
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

  const loadFiveFivePrizes = async () => {
    try {
      setLoadingPrizes(true);
      const { data, error } = await supabase
        .from("fivefive_prizes")
        .select("*")
        .order("rank_position", { ascending: true });

      if (error) throw error;

      // Initialize with at least 5 prize slots if empty
      if (!data || data.length === 0) {
        const initialPrizes: Partial<FiveFivePrize>[] = Array.from({ length: 5 }, (_, i) => ({
          rank_position: i + 1,
          prize_amount: 0,
          winner_count: 1,
        }));
        setFivefivePrizes(initialPrizes as FiveFivePrize[]);
      } else {
        setFivefivePrizes(data);
      }
    } catch (error: any) {
      toast({
        title: "Error loading prizes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingPrizes(false);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);

      // Save club name
      const { error: nameError } = await supabase
        .from("club_settings")
        .upsert({
          setting_key: "club_name",
          setting_value: clubName,
          updated_at: new Date().toISOString(),
        });

      if (nameError) throw nameError;

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
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size must be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);

        // Save to database
        const { error } = await supabase
          .from("club_settings")
          .upsert({
            setting_key: "logo_base64",
            setting_value: base64String,
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Logo uploaded successfully",
        });
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLogo = async () => {
    try {
      setUploading(true);

      const { error } = await supabase
        .from("club_settings")
        .delete()
        .eq("setting_key", "logo_base64");

      if (error) throw error;

      setLogoPreview(null);
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
      setUploading(false);
    }
  };

  const addPrizeRank = () => {
    const newRank = fivefivePrizes.length + 1;
    setFivefivePrizes([
      ...fivefivePrizes,
      {
        id: `temp-${Date.now()}`,
        rank_position: newRank,
        prize_amount: 0,
        winner_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as FiveFivePrize,
    ]);
  };

  const removePrizeRank = (index: number) => {
    const updated = fivefivePrizes.filter((_, i) => i !== index);
    // Re-number rank positions
    updated.forEach((prize, i) => {
      prize.rank_position = i + 1;
    });
    setFivefivePrizes(updated);
  };

  const updatePrize = (index: number, field: keyof FiveFivePrize, value: any) => {
    const updated = [...fivefivePrizes];
    updated[index] = { ...updated[index], [field]: value };
    setFivefivePrizes(updated);
  };

  const saveFiveFivePrizes = async () => {
    try {
      setSavingPrizes(true);

      // Delete all existing prizes
      const { error: deleteError } = await supabase
        .from("fivefive_prizes")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

      if (deleteError) throw deleteError;

      // Insert new prizes (without temp IDs)
      const prizesToInsert = fivefivePrizes.map(({ id, created_at, updated_at, ...prize }) => ({
        ...prize,
        updated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from("fivefive_prizes")
        .insert(prizesToInsert);

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "FiveFive prize settings saved successfully",
      });

      // Reload to get proper IDs
      await loadFiveFivePrizes();
    } catch (error: any) {
      toast({
        title: "Error saving prizes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingPrizes(false);
    }
  };

  if (loading || loadingPrizes) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Club Settings Card */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Club Settings</CardTitle>
          <CardDescription className="text-gray-600">
            Configure your bowling club information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Club Name */}
          <div className="space-y-2">
            <Label htmlFor="clubName" className="text-gray-700">
              Club Name
            </Label>
            <Input
              id="clubName"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="Enter club name"
              className="bg-white border-gray-300 text-gray-900"
            />
          </div>

          {/* Club Logo */}
          <div className="space-y-2">
            <Label className="text-gray-700">Club Logo</Label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-gray-200">
                  <img
                    src={logoPreview}
                    alt="Club Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="logoUpload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Upload Logo"}
                </Label>
                <input
                  id="logoUpload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="hidden"
                />
                {logoPreview && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteLogo}
                    disabled={uploading}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Logo
                  </Button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Recommended: Square image, max 2MB
            </p>
          </div>

          <Button
            onClick={saveSettings}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Club Settings
          </Button>
        </CardContent>
      </Card>

      {/* FiveFive Prize Settings Card */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">FiveFive Prize Settings</CardTitle>
          <CardDescription className="text-gray-600">
            Configure prize distribution for FiveFive games. Set prize amount and number of winners for each rank.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Prize Configuration Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 uppercase">
                Prize Configuration
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={addPrizeRank}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Rank
              </Button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-3 bg-gray-50 rounded-t-lg border border-gray-200 font-semibold text-sm text-gray-700">
              <div className="col-span-2">Rank</div>
              <div className="col-span-4">Prize Amount (RM)</div>
              <div className="col-span-4">Number of Winners</div>
              <div className="col-span-2">Action</div>
            </div>

            {/* Prize Rows */}
            <div className="space-y-2">
              {fivefivePrizes.map((prize, index) => (
                <div
                  key={prize.id || index}
                  className="grid grid-cols-12 gap-4 p-3 bg-white border border-gray-200 rounded-lg items-center"
                >
                  {/* Rank Position */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-red-600">
                        #{prize.rank_position}
                      </span>
                    </div>
                  </div>

                  {/* Prize Amount */}
                  <div className="col-span-4">
                    <Input
                      type="number"
                      value={prize.prize_amount}
                      onChange={(e) =>
                        updatePrize(index, "prize_amount", parseFloat(e.target.value) || 0)
                      }
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>

                  {/* Winner Count */}
                  <div className="col-span-4">
                    <Input
                      type="number"
                      value={prize.winner_count}
                      onChange={(e) =>
                        updatePrize(index, "winner_count", parseInt(e.target.value) || 1)
                      }
                      placeholder="1"
                      min="1"
                      max="10"
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>

                  {/* Remove Button */}
                  <div className="col-span-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePrizeRank(index)}
                      disabled={fivefivePrizes.length <= 1}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Helper Text */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>How it works:</strong>
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>
                  <strong>Prize Amount:</strong> The prize money for this rank position
                </li>
                <li>
                  <strong>Number of Winners:</strong> If set to 2, the top 2 players at this rank will share the prize equally
                </li>
                <li>
                  <strong>Tied Scores:</strong> If players have the same overall score, prizes will be combined and split equally
                </li>
                <li>
                  Example: Rank #1 prize RM100, 2 winners → Each winner gets RM50
                </li>
              </ul>
            </div>
          </div>

          <Button
            onClick={saveFiveFivePrizes}
            disabled={savingPrizes}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {savingPrizes && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Prize Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}