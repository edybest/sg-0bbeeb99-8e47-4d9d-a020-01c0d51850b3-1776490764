import { supabase } from "@/integrations/supabase/client";

export type ColorType = "solid" | "gradient";

export interface ColorConfig {
  type: ColorType;
  value: string; // e.g., "#ffffff" or "linear-gradient(to right, #ff0000, #0000ff)"
  gradientParams?: {
    angle: string;
    colors: string[];
  };
}

export interface ThemeColors {
  background: ColorConfig;
  primary: ColorConfig;
  card: ColorConfig;
  text: ColorConfig;
  link: ColorConfig;
  icon: ColorConfig;
  header: ColorConfig;
  footer: ColorConfig;
  welcomeCard: ColorConfig;
}

export interface AppTheme {
  light: ThemeColors;
  dark: ThemeColors;
}

export interface ThemePreset {
  id: string;
  name: string;
  theme: AppTheme;
}

const defaultGradient = { angle: "to right", colors: ["#3b82f6", "#8b5cf6"] };

export const DEFAULT_THEME: AppTheme = {
  light: {
    background: { type: "solid", value: "0 0% 100%", gradientParams: defaultGradient },
    primary: { type: "solid", value: "220 90% 56%", gradientParams: defaultGradient },
    card: { type: "solid", value: "0 0% 100%", gradientParams: defaultGradient },
    text: { type: "solid", value: "222.2 84% 4.9%", gradientParams: defaultGradient },
    link: { type: "solid", value: "220 90% 56%", gradientParams: defaultGradient },
    icon: { type: "solid", value: "222.2 84% 4.9%", gradientParams: defaultGradient },
    header: { type: "solid", value: "0 0% 100%", gradientParams: defaultGradient },
    footer: { type: "solid", value: "0 0% 100%", gradientParams: defaultGradient },
    welcomeCard: { type: "gradient", value: "linear-gradient(to right, #dc2626, #b91c1c)", gradientParams: { angle: "to right", colors: ["#dc2626", "#b91c1c"] } },
  },
  dark: {
    background: { type: "solid", value: "222.2 84% 4.9%", gradientParams: defaultGradient },
    primary: { type: "solid", value: "217.2 91.2% 59.8%", gradientParams: defaultGradient },
    card: { type: "solid", value: "222.2 84% 4.9%", gradientParams: defaultGradient },
    text: { type: "solid", value: "210 40% 98%", gradientParams: defaultGradient },
    link: { type: "solid", value: "217.2 91.2% 59.8%", gradientParams: defaultGradient },
    icon: { type: "solid", value: "210 40% 98%", gradientParams: defaultGradient },
    header: { type: "solid", value: "222.2 84% 4.9%", gradientParams: defaultGradient },
    footer: { type: "solid", value: "222.2 84% 4.9%", gradientParams: defaultGradient },
    welcomeCard: { type: "gradient", value: "linear-gradient(to right, #b91c1c, #991b1b)", gradientParams: { angle: "to right", colors: ["#b91c1c", "#991b1b"] } },
  }
};

// Some predefined palettes for quick switching
export const PREDEFINED_PRESETS: ThemePreset[] = [
  {
    id: "default",
    name: "Default (AMBC Red/Blue)",
    theme: DEFAULT_THEME
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    theme: {
      light: {
        ...DEFAULT_THEME.light,
        primary: { type: "solid", value: "200 98% 39%", gradientParams: defaultGradient }, // light blue
        header: { type: "solid", value: "204 100% 97%", gradientParams: defaultGradient },
        welcomeCard: { type: "gradient", value: "linear-gradient(to right, #0284c7, #38bdf8)", gradientParams: { angle: "to right", colors: ["#0284c7", "#38bdf8"] } },
        link: { type: "solid", value: "200 98% 39%", gradientParams: defaultGradient },
      },
      dark: {
        ...DEFAULT_THEME.dark,
        primary: { type: "solid", value: "200 98% 39%", gradientParams: defaultGradient },
        welcomeCard: { type: "gradient", value: "linear-gradient(to right, #0369a1, #0284c7)", gradientParams: { angle: "to right", colors: ["#0369a1", "#0284c7"] } },
        link: { type: "solid", value: "200 98% 39%", gradientParams: defaultGradient },
      }
    }
  },
  {
    id: "forest-green",
    name: "Forest Green",
    theme: {
      light: {
        ...DEFAULT_THEME.light,
        primary: { type: "solid", value: "142 71% 45%", gradientParams: defaultGradient }, // emerald
        header: { type: "solid", value: "152 81% 96%", gradientParams: defaultGradient },
        welcomeCard: { type: "gradient", value: "linear-gradient(to right, #059669, #10b981)", gradientParams: { angle: "to right", colors: ["#059669", "#10b981"] } },
        link: { type: "solid", value: "142 71% 45%", gradientParams: defaultGradient },
      },
      dark: {
        ...DEFAULT_THEME.dark,
        primary: { type: "solid", value: "142 71% 45%", gradientParams: defaultGradient },
        welcomeCard: { type: "gradient", value: "linear-gradient(to right, #047857, #059669)", gradientParams: { angle: "to right", colors: ["#047857", "#059669"] } },
        link: { type: "solid", value: "142 71% 45%", gradientParams: defaultGradient },
      }
    }
  },
  {
    id: "midnight-purple",
    name: "Midnight Purple",
    theme: {
      light: {
        ...DEFAULT_THEME.light,
        primary: { type: "solid", value: "262 83% 58%", gradientParams: defaultGradient }, // violet
        header: { type: "solid", value: "268 100% 97%", gradientParams: defaultGradient },
        welcomeCard: { type: "gradient", value: "linear-gradient(to right, #7c3aed, #8b5cf6)", gradientParams: { angle: "to right", colors: ["#7c3aed", "#8b5cf6"] } },
        link: { type: "solid", value: "262 83% 58%", gradientParams: defaultGradient },
      },
      dark: {
        ...DEFAULT_THEME.dark,
        primary: { type: "solid", value: "262 83% 58%", gradientParams: defaultGradient },
        welcomeCard: { type: "gradient", value: "linear-gradient(to right, #6d28d9, #7c3aed)", gradientParams: { angle: "to right", colors: ["#6d28d9", "#7c3aed"] } },
        link: { type: "solid", value: "262 83% 58%", gradientParams: defaultGradient },
      }
    }
  }
];

export const themeService = {
  async getTheme(): Promise<AppTheme> {
    try {
      const { data, error } = await supabase
        .from("club_settings")
        .select("setting_value")
        .eq("setting_key", "app_theme_config")
        .single();

      if (error || !data?.setting_value) return DEFAULT_THEME;
      
      const parsed = JSON.parse(data.setting_value) as Partial<AppTheme>;
      
      // Merge with DEFAULT_THEME to handle newly added keys (backward compatibility)
      return {
        light: { ...DEFAULT_THEME.light, ...(parsed.light || {}) },
        dark: { ...DEFAULT_THEME.dark, ...(parsed.dark || {}) }
      };
    } catch (err) {
      console.error("Failed to parse theme config:", err);
      return DEFAULT_THEME;
    }
  },

  async saveTheme(theme: AppTheme): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("club_settings")
        .upsert(
          {
            setting_key: "app_theme_config",
            setting_value: JSON.stringify(theme),
          },
          { onConflict: "setting_key" }
        );

      if (error) throw error;
      
      // Dispatch event to trigger immediate update
      window.dispatchEvent(new CustomEvent("app-theme-updated", { detail: theme }));
      
      return true;
    } catch (err) {
      console.error("Failed to save theme config:", err);
      return false;
    }
  },

  async getCustomPresets(): Promise<ThemePreset[]> {
    try {
      const { data, error } = await supabase
        .from("club_settings")
        .select("setting_value")
        .eq("setting_key", "theme_custom_presets")
        .single();

      if (error || !data?.setting_value) return [];
      
      return JSON.parse(data.setting_value) as ThemePreset[];
    } catch (err) {
      console.error("Failed to parse custom presets:", err);
      return [];
    }
  },

  async saveCustomPresets(presets: ThemePreset[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("club_settings")
        .upsert(
          {
            setting_key: "theme_custom_presets",
            setting_value: JSON.stringify(presets),
          },
          { onConflict: "setting_key" }
        );

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Failed to save custom presets:", err);
      return false;
    }
  }
};