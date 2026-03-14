import { supabase } from "@/integrations/supabase/client";

export type ColorType = "solid" | "gradient";

export interface ColorConfig {
  type: ColorType;
  value: string; // e.g., "#ffffff" or "linear-gradient(to right, #ff0000, #0000ff)"
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

const DEFAULT_THEME: AppTheme = {
  light: {
    background: { type: "solid", value: "0 0% 100%" }, // HSL for white
    primary: { type: "solid", value: "220 90% 56%" }, // HSL for primary
    card: { type: "solid", value: "0 0% 100%" }, // HSL for white
    text: { type: "solid", value: "222.2 84% 4.9%" }, // HSL for dark text
  },
  dark: {
    background: { type: "solid", value: "222.2 84% 4.9%" }, // HSL for dark bg
    primary: { type: "solid", value: "217.2 91.2% 59.8%" }, // HSL for primary
    card: { type: "solid", value: "222.2 84% 4.9%" }, // HSL for dark card
    text: { type: "solid", value: "210 40% 98%" }, // HSL for light text
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