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
}

export interface AppTheme {
  light: ThemeColors;
  dark: ThemeColors;
}

const defaultGradient = { angle: "to right", colors: ["#3b82f6", "#8b5cf6"] };

const DEFAULT_THEME: AppTheme = {
  light: {
    background: { type: "solid", value: "0 0% 100%", gradientParams: defaultGradient },
    primary: { type: "solid", value: "220 90% 56%", gradientParams: defaultGradient },
    card: { type: "solid", value: "0 0% 100%", gradientParams: defaultGradient },
    text: { type: "solid", value: "222.2 84% 4.9%", gradientParams: defaultGradient },
  },
  dark: {
    background: { type: "solid", value: "222.2 84% 4.9%", gradientParams: defaultGradient },
    primary: { type: "solid", value: "217.2 91.2% 59.8%", gradientParams: defaultGradient },
    card: { type: "solid", value: "222.2 84% 4.9%", gradientParams: defaultGradient },
    text: { type: "solid", value: "210 40% 98%", gradientParams: defaultGradient },
  }
};

export const themeService = {
  async getTheme(): Promise<AppTheme> {
    try {
      const { data, error } = await supabase
        .from("club_settings")
        .select("setting_value")
        .eq("setting_key", "app_theme_config")
        .single();

      if (error || !data?.setting_value) return DEFAULT_THEME;
      
      return JSON.parse(data.setting_value) as AppTheme;
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
  }
};