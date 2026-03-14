"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";
import { themeService, type AppTheme } from "@/services/themeService";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [themeConfig, setThemeConfig] = React.useState<AppTheme | null>(null);

  React.useEffect(() => {
    // Load initial theme config
    themeService.getTheme().then(setThemeConfig);

    // Listen for real-time theme updates from admin panel
    const handleThemeUpdate = (e: CustomEvent<AppTheme>) => {
      setThemeConfig(e.detail);
    };

    window.addEventListener("app-theme-updated", handleThemeUpdate as EventListener);
    return () => window.removeEventListener("app-theme-updated", handleThemeUpdate as EventListener);
  }, []);

  // Generate dynamic CSS based on theme config
  const renderDynamicStyles = () => {
    if (!themeConfig) return null;

    const generateModeVars = (mode: "light" | "dark", config: AppTheme) => {
      const colors = config[mode];
      
      // Helper to process color based on type
      const processValue = (color: typeof colors.background, cssVarName: string) => {
        if (color.type === 'gradient') {
          // Gradients need to be applied via style or override specific utilities, 
          // but we can set them as CSS variables for custom classes
          return `--${cssVarName}-gradient: ${color.value};`;
        }
        return `--${cssVarName}: ${color.value};`;
      };

      return `
        ${processValue(colors.background, 'background')}
        ${processValue(colors.primary, 'primary')}
        ${processValue(colors.card, 'card')}
        ${processValue(colors.text, 'foreground')}
      `;
    };

    return (
      <style dangerouslySetInnerHTML={{
        __html: `
          :root {
            ${generateModeVars("light", themeConfig)}
          }
          .dark {
            ${generateModeVars("dark", themeConfig)}
          }
          
          /* Apply custom gradient backgrounds if configured */
          body {
            background: var(--background-gradient, hsl(var(--background)));
          }
          
          .bg-primary {
            background: var(--primary-gradient, hsl(var(--primary))) !important;
          }
          
          .bg-card {
            background: var(--card-gradient, hsl(var(--card))) !important;
          }
        `
      }} />
    );
  };

  return (
    <NextThemesProvider {...props}>
      {renderDynamicStyles()}
      {children}
    </NextThemesProvider>
  );
}