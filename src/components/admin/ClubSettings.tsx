import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Trash2, Trophy, Info, Save } from "lucide-react";

export function ClubSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clubName, setClubName] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // FiveFive Prize Settings State
  const [fivefiveTotalPlayers, setFivefiveTotalPlayers] = useState(10);
  const [fivefivePrizeCount, setFivefivePrizeCount] = useState(5);
  const [fivefivePrizes, setFivefivePrizes] = useState<number[]>([100, 80, 50, 30, 20]);
  const [isSavingFivefive, setIsSavingFivefive] = useState(false);

  useEffect(() => {
    loadSettings();
    loadFivefivePrizeConfig();
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

  const loadFivefivePrizeConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("fivefive_prizes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFivefiveTotalPlayers(data.total_players);
        setFivefivePrizeCount(data.prize_count);
        // Safely parse prizes JSONB array to number[]
        const parsedPrizes = Array.isArray(data.prizes) ? data.prizes.map(Number) : [];
        setFivefivePrizes(parsedPrizes);
      }
    } catch (error: any) {
      console.error("Error loading FiveFive prize config:", error);
      toast({
        title: "Error",
        description: "Failed to load FiveFive prize settings",
        variant: "destructive",
      });
    }
  };

  const handlePrizeCountChange = (count: number) => {
    setFivefivePrizeCount(count);
    
    // Adjust prizes array to match new count
    const newPrizes = [...fivefivePrizes];
    if (count > newPrizes.length) {
      // Add default prizes (decrease by 20 for each rank)
      const lastPrize = newPrizes[newPrizes.length - 1] || 100;
      for (let i = newPrizes.length; i < count; i++) {
        newPrizes.push(Math.max(10, lastPrize - (20 * (i - newPrizes.length + 1))));
      }
    } else if (count < newPrizes.length) {
      // Remove excess prizes
      newPrizes.splice(count);
    }
    setFivefivePrizes(newPrizes);
  };

  const handlePrizeChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newPrizes = [...fivefivePrizes];
    newPrizes[index] = numValue;
    setFivefivePrizes(newPrizes);
  };

  const saveFivefivePrizeSettings = async () => {
    try {
      setIsSavingFivefive(true);

      // Validate
      if (fivefivePrizeCount > fivefiveTotalPlayers) {
        toast({
          title: "Error",
          description: "Prize count cannot exceed total players",
          variant: "destructive",
        });
        return;
      }

      if (fivefivePrizes.some(p => p <= 0)) {
        toast({
          title: "Error",
          description: "All prizes must be greater than 0",
          variant: "destructive",
        });
        return;
      }

      // Delete old config
      await supabase.from("fivefive_prizes").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // Insert new config
      const { error } = await supabase
        .from("fivefive_prizes")
        .insert({
          total_players: fivefiveTotalPlayers,
          prize_count: fivefivePrizeCount,
          prizes: fivefivePrizes, // Will be cast to JSONB
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "FiveFive prize settings saved successfully",
      });

      loadFivefivePrizeConfig();
    } catch (error: any) {
      console.error("Error saving FiveFive prize settings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save FiveFive prize settings",
        variant: "destructive",
      });
    } finally {
      setIsSavingFivefive(false);
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

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

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

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);

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

  if (loading) {
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

      {/* FiveFive Prize Settings */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-red-600" />
            FiveFive Prize Settings
          </CardTitle>
          <CardDescription className="text-gray-600">
            Configure prize distribution for FiveFive games
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Total Players */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Jumlah Pemain
              </label>
              <Input
                type="number"
                min="1"
                max="50"
                value={fivefiveTotalPlayers}
                onChange={(e) => setFivefiveTotalPlayers(parseInt(e.target.value) || 1)}
                className="bg-white border-gray-300 text-gray-900"
              />
              <p className="text-xs text-gray-500">
                Total number of players in the game
              </p>
            </div>

            {/* Prize Count */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Jumlah Hadiah
              </label>
              <Input
                type="number"
                min="1"
                max={fivefiveTotalPlayers}
                value={fivefivePrizeCount}
                onChange={(e) => handlePrizeCountChange(parseInt(e.target.value) || 1)}
                className="bg-white border-gray-300 text-gray-900"
              />
              <p className="text-xs text-gray-500">
                Number of prizes to distribute (creates {fivefivePrizeCount} input boxes)
              </p>
            </div>
          </div>

          {/* Prize Amount Inputs */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              Prize Amounts (RM)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {Array.from({ length: fivefivePrizeCount }).map((_, index) => (
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
                      value={fivefivePrizes[index] || 0}
                      onChange={(e) => handlePrizeChange(index, e.target.value)}
                      className="bg-white border-gray-300 text-gray-900 pl-12"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              💡 <strong>How it works:</strong> Prize #1 goes to rank 1, Prize #2 to rank 2, and so on.
              If players tie, their prizes are combined and split equally.
            </p>
          </div>

          {/* Prize Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Prize Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Total Players</p>
                <p className="font-semibold text-gray-900">{fivefiveTotalPlayers}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Prizes</p>
                <p className="font-semibold text-gray-900">{fivefivePrizeCount}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Prize Pool</p>
                <p className="font-semibold text-red-600">
                  RM {fivefivePrizes.reduce((sum, prize) => sum + prize, 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Per Player Avg</p>
                <p className="font-semibold text-gray-900">
                  RM {(fivefivePrizes.reduce((sum, prize) => sum + prize, 0) / fivefiveTotalPlayers).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Example */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Example Prize Distribution
            </h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• Rank #1: RM {fivefivePrizes[0]?.toFixed(2) || "0.00"}</p>
              <p>• Rank #2: RM {fivefivePrizes[1]?.toFixed(2) || "0.00"}</p>
              <p>• Rank #3: RM {fivefivePrizes[2]?.toFixed(2) || "0.00"}</p>
              {fivefivePrizeCount > 3 && <p className="text-xs">... and {fivefivePrizeCount - 3} more</p>}
              <p className="text-xs pt-2 border-t border-blue-200">
                <strong>If 2 players tie for rank 2:</strong> They share Prize #2 + Prize #3 equally
              </p>
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={saveFivefivePrizeSettings}
            disabled={isSavingFivefive}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
          >
            {isSavingFivefive ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Prize Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}