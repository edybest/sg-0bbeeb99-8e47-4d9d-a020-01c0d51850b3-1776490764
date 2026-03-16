import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Plus, X, Save, RotateCcw, Bookmark, Download } from "lucide-react";
import { themeService, type AppTheme, type ThemeColors, type ColorConfig, DEFAULT_THEME, PREDEFINED_PRESETS, type ThemePreset } from "@/services/themeService";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Utils to convert between Hex (for color picker) and HSL (for Shadcn)
function hexToHsl(hex: string): string {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslToHex(hslStr: string): string {
  if (!hslStr) return "#000000";
  const parts = hslStr.replace(/%/g, "").split(" ");
  if (parts.length < 3) return "#000000";

  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function ThemeSettingsPanel() {
  const { toast } = useToast();
  const [themeConfig, setThemeConfig] = useState<AppTheme | null>(null);
  const [loading, setLoading] = useState(false);
  const [customPresets, setCustomPresets] = useState<ThemePreset[]>([]);
  const [newPresetName, setNewPresetName] = useState("");
  const [isSavePresetOpen, setIsSavePresetOpen] = useState(false);

  useEffect(() => {
    loadTheme();
    loadPresets();
  }, []);

  const loadTheme = async () => {
    const config = await themeService.getTheme();
    setThemeConfig(config);
  };

  const loadPresets = async () => {
    const presets = await themeService.getCustomPresets();
    setCustomPresets(presets);
  };

  const handleSave = async () => {
    if (!themeConfig) return;
    setLoading(true);
    const success = await themeService.saveTheme(themeConfig);
    if (success) {
      toast({ title: "✅ Berjaya", description: "Tema telah dikemas kini." });
    } else {
      toast({ title: "❌ Ralat", description: "Gagal menyimpan tema.", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleResetToDefault = () => {
    setThemeConfig(DEFAULT_THEME);
    toast({ title: "ℹ️ Tema Direset", description: "Tema telah dikembalikan ke tetapan asal. Sila klik 'Simpan Tema' untuk mengesahkan." });
  };

  const applyPreset = (preset: ThemePreset) => {
    setThemeConfig(preset.theme);
    toast({ title: "🎨 Tema Dimuatkan", description: `Pratetap "${preset.name}" telah digunakan.` });
  };

  const handleSavePreset = async () => {
    if (!themeConfig || !newPresetName.trim()) return;
    
    const newPreset: ThemePreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName.trim(),
      theme: themeConfig
    };

    const updatedPresets = [...customPresets, newPreset];
    const success = await themeService.saveCustomPresets(updatedPresets);
    
    if (success) {
      setCustomPresets(updatedPresets);
      setNewPresetName("");
      setIsSavePresetOpen(false);
      toast({ title: "✅ Berjaya", description: "Pratetap baharu telah disimpan." });
    } else {
      toast({ title: "❌ Ralat", description: "Gagal menyimpan pratetap." });
    }
  };

  const deleteCustomPreset = async (id: string) => {
    const updatedPresets = customPresets.filter(p => p.id !== id);
    const success = await themeService.saveCustomPresets(updatedPresets);
    if (success) {
      setCustomPresets(updatedPresets);
      toast({ title: "🗑️ Berjaya", description: "Pratetap telah dipadam." });
    }
  };

  const updateColor = (mode: "light" | "dark", key: keyof ThemeColors, updates: Partial<ColorConfig>) => {
    setThemeConfig((prev) => {
      if (!prev) return prev;
      const currentMode = prev[mode];
      const currentColor = currentMode[key];

      const newColor = { ...currentColor, ...updates };

      // Make sure we have default gradient params if turning on gradient
      if (newColor.type === "gradient" && !newColor.gradientParams) {
        newColor.gradientParams = { angle: "to right", colors: ["#3b82f6", "#8b5cf6"] };
      }

      // Recompute CSS value if gradient
      if (newColor.type === "gradient" && newColor.gradientParams) {
        const { angle, colors } = newColor.gradientParams;
        newColor.value = `linear-gradient(${angle}, ${colors.join(", ")})`;
      }

      return { ...prev, [mode]: { ...currentMode, [key]: newColor } };
    });
  };

  const renderColorEditor = (mode: "light" | "dark", key: keyof ThemeColors, label: string, allowGradient = true) => {
    if (!themeConfig) return null;
    const color = themeConfig[mode][key] ?? DEFAULT_THEME[mode][key];
    if (!color) return null;
    const isGradient = color.type === "gradient";

    return (
      <div className="rounded-lg border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">{label}</Label>
          {allowGradient && (
            <div className="flex items-center space-x-2">
              <Label className="text-sm text-muted-foreground">Guna Gradient</Label>
              <Switch
                checked={isGradient}
                onCheckedChange={(checked) => updateColor(mode, key, { type: checked ? "gradient" : "solid" })}
              />
            </div>
          )}
        </div>

        {!isGradient ? (
          <div className="flex items-center space-x-4">
            <div className="relative overflow-hidden rounded-md border border-input h-10 w-20 flex-shrink-0">
              <input
                type="color"
                value={hslToHex(color.value)}
                onChange={(e) => updateColor(mode, key, { value: hexToHsl(e.target.value) })}
                className="absolute -top-2 -left-2 h-16 w-24 cursor-pointer border-0 bg-transparent p-0"
              />
            </div>
            <Input
              value={hslToHex(color.value).toUpperCase()}
              onChange={(e) => {
                if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                  updateColor(mode, key, { value: hexToHsl(e.target.value) });
                }
              }}
              className="w-32 font-mono uppercase"
              placeholder="#FFFFFF"
            />
            <div className="flex-1 h-10 rounded-md border" style={{ backgroundColor: hslToHex(color.value) }} />
          </div>
        ) : (
          <div className="space-y-4 rounded-md bg-muted/50 p-4">
            <div className="flex items-center gap-4">
              <Label className="w-24 shrink-0">Arah (Angle)</Label>
              <Select
                value={color.gradientParams?.angle || "to right"}
                onValueChange={(val) =>
                  updateColor(mode, key, { gradientParams: { ...color.gradientParams!, angle: val } })
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="to right">Kanan (To Right)</SelectItem>
                  <SelectItem value="to left">Kiri (To Left)</SelectItem>
                  <SelectItem value="to bottom">Bawah (To Bottom)</SelectItem>
                  <SelectItem value="to top">Atas (To Top)</SelectItem>
                  <SelectItem value="to bottom right">Bawah Kanan (Bottom Right)</SelectItem>
                  <SelectItem value="135deg">135 Darjah (Cross)</SelectItem>
                  <SelectItem value="45deg">45 Darjah (Cross)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Warna Gradient (Minimum 2)</Label>
              {color.gradientParams?.colors.map((c, idx) => (
                <div key={idx} className="flex items-center space-x-3">
                  <span className="text-xs text-muted-foreground w-6 text-right">{idx + 1}.</span>
                  <div className="relative overflow-hidden rounded-md border border-input h-10 w-16 flex-shrink-0">
                    <input
                      type="color"
                      value={c}
                      onChange={(e) => {
                        const newColors = [...color.gradientParams!.colors];
                        newColors[idx] = e.target.value;
                        updateColor(mode, key, { gradientParams: { ...color.gradientParams!, colors: newColors } });
                      }}
                      className="absolute -top-2 -left-2 h-16 w-24 cursor-pointer border-0 bg-transparent p-0"
                    />
                  </div>
                  <Input
                    value={c.toUpperCase()}
                    onChange={(e) => {
                      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                        const newColors = [...color.gradientParams!.colors];
                        newColors[idx] = e.target.value;
                        updateColor(mode, key, { gradientParams: { ...color.gradientParams!, colors: newColors } });
                      }
                    }}
                    className="w-32 font-mono uppercase"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      const newColors = color.gradientParams!.colors.filter((_, i) => i !== idx);
                      updateColor(mode, key, { gradientParams: { ...color.gradientParams!, colors: newColors } });
                    }}
                    disabled={color.gradientParams!.colors.length <= 2}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  const newColors = [...color.gradientParams!.colors, "#ffffff"];
                  updateColor(mode, key, { gradientParams: { ...color.gradientParams!, colors: newColors } });
                }}
              >
                <Plus className="w-4 h-4 mr-2" /> Tambah Warna
              </Button>
            </div>

            <div className="mt-4 pt-4 border-t">
              <Label className="block mb-2">Preview Gradient</Label>
              <div 
                className="w-full h-16 rounded-md border shadow-sm" 
                style={{ background: color.value }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!themeConfig) {
    return <div className="p-8 text-center">Memuatkan tetapan tema...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Editor Tema (Theme Colors)
          </CardTitle>
          <CardDescription>Ubah warna Latar Belakang, Butang, dan Kad untuk mod cerah dan gelap.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          
          <Dialog open={isSavePresetOpen} onOpenChange={setIsSavePresetOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Bookmark className="w-4 h-4 mr-2" /> Simpan Preset
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Simpan Tema Semasa</DialogTitle>
                <DialogDescription>
                  Simpan kombinasi warna ini sebagai pratetap untuk digunakan pada masa hadapan.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label>Nama Pratetap (Preset Name)</Label>
                <Input 
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Contoh: Tema Merdeka"
                  className="mt-2"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsSavePresetOpen(false)}>Batal</Button>
                <Button onClick={handleSavePreset} disabled={!newPresetName.trim()}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="destructive" onClick={handleResetToDefault} disabled={loading} size="sm">
            <RotateCcw className="w-4 h-4 mr-2" /> Reset ke Asal
          </Button>

          <Button onClick={handleSave} disabled={loading} size="sm">
            <Save className="w-4 h-4 mr-2" /> {loading ? "Menyimpan..." : "Simpan Tema Global"}
          </Button>
        </div>
      </CardHeader>

      <div className="px-6 pb-2">
        <div className="flex flex-col space-y-2 mb-6 p-4 rounded-lg bg-muted/30 border border-border">
          <Label className="text-sm font-semibold flex items-center">
            <Download className="w-4 h-4 mr-2" /> Tema Pratetap (Quick Presets)
          </Label>
          <div className="flex flex-wrap gap-2 pt-2">
            {PREDEFINED_PRESETS.map((preset) => (
              <Button 
                key={preset.id} 
                variant="outline" 
                size="sm"
                onClick={() => applyPreset(preset)}
              >
                {preset.name}
              </Button>
            ))}
            
            {customPresets.length > 0 && <div className="w-px h-6 bg-border mx-2 self-center"></div>}
            
            {customPresets.map((preset) => (
              <div key={preset.id} className="flex items-center group">
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => applyPreset(preset)}
                >
                  ⭐ {preset.name}
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="rounded-l-none border-l border-border px-2 text-destructive hover:bg-destructive/20"
                  onClick={() => deleteCustomPreset(preset.id)}
                  title="Padam Preset"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CardContent>
        <Tabs defaultValue="light" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="light">☀️ Light Mode</TabsTrigger>
            <TabsTrigger value="dark">🌙 Dark Mode</TabsTrigger>
          </TabsList>
          
          <TabsContent value="light" className="space-y-6">
            {renderColorEditor("light", "background", "Latar Belakang (Page Background)", true)}
            {renderColorEditor("light", "primary", "Warna Utama (Butang/Aksen)", true)}
            {renderColorEditor("light", "card", "Latar Kad (Card Background)", true)}
            {renderColorEditor("light", "cardBorder", "Border Kad (Card Border)", true)}
            {renderColorEditor("light", "header", "Header (Latar Atas)", true)}
            {renderColorEditor("light", "footer", "Footer (Latar Bawah)", true)}
            {renderColorEditor("light", "welcomeCard", "Kad Selamat Datang (Welcome Card)", true)}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-6 mt-6">
              {renderColorEditor("light", "text", "Warna Teks", false)}
              {renderColorEditor("light", "link", "Warna Pautan (Link)", true)}
              {renderColorEditor("light", "icon", "Warna Ikon", true)}
            </div>
          </TabsContent>
          
          <TabsContent value="dark" className="space-y-6">
            {renderColorEditor("dark", "background", "Latar Belakang (Page Background)", true)}
            {renderColorEditor("dark", "primary", "Warna Utama (Butang/Aksen)", true)}
            {renderColorEditor("dark", "card", "Latar Kad (Card Background)", true)}
            {renderColorEditor("dark", "cardBorder", "Border Kad (Card Border)", true)}
            {renderColorEditor("dark", "header", "Header (Latar Atas)", true)}
            {renderColorEditor("dark", "footer", "Footer (Latar Bawah)", true)}
            {renderColorEditor("dark", "welcomeCard", "Kad Selamat Datang (Welcome Card)", true)}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-6 mt-6">
              {renderColorEditor("dark", "text", "Warna Teks", false)}
              {renderColorEditor("dark", "link", "Warna Pautan (Link)", true)}
              {renderColorEditor("dark", "icon", "Warna Ikon", true)}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}