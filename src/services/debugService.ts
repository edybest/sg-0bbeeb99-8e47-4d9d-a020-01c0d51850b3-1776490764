import { supabase } from "@/integrations/supabase/client";

export const debugService = {
  async getMemberDebugEnabled(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("club_settings")
        .select("setting_value")
        .eq("setting_key", "member_debug_enabled")
        .maybeSingle();

      if (error) {
        console.error("[debugService] getMemberDebugEnabled error:", error.message);
        return false;
      }

      if (!data?.setting_value) return false;
      return data.setting_value === "true";
    } catch (err) {
      console.error("[debugService] getMemberDebugEnabled unexpected error:", err);
      return false;
    }
  },

  async setMemberDebugEnabled(enabled: boolean): Promise<boolean> {
    try {
      const value = enabled ? "true" : "false";

      const { error } = await supabase
        .from("club_settings")
        .upsert(
          {
            setting_key: "member_debug_enabled",
            setting_value: value,
          },
          { onConflict: "setting_key" }
        );

      if (error) {
        console.error("[debugService] setMemberDebugEnabled error:", error.message);
        return false;
      }

      return true;
    } catch (err) {
      console.error("[debugService] setMemberDebugEnabled unexpected error:", err);
      return false;
    }
  },
};