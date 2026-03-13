import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type NavLayoutRow = Database["public"]["Tables"]["nav_layout_settings"]["Row"];

export type MemberDashboardCardKey =
  | "blok"
  | "fivefive"
  | "training"
  | "gallery"
  | "hall_of_fame"
  | "lane"
  | "undi_lane"
  | "average_score"
  | "feedback";

export type MemberMenuItemKey =
  | "dashboard"
  | "blok"
  | "fivefive"
  | "training"
  | "gallery"
  | "undi_lane"
  | "hall_of_fame"
  | "average_score"
  | "feedback"
  | "profile";

export type LayoutKey = "member_dashboard_cards" | "member_menu" | "navigation_settings";

export type LayoutValue = {
  order: string[];
};

export type NavPosition = "top" | "bottom" | "sidebar";

export type NavigationSettings = {
  position: NavPosition;
  isFixed: boolean;
  isCompact: boolean;
};

const DEFAULT_NAV_SETTINGS: NavigationSettings = {
  position: "bottom",
  isFixed: true,
  isCompact: false,
};

function parseLayoutValue(row: NavLayoutRow | null): LayoutValue | null {
  if (!row) return null;
  const v = row.value as unknown;
  if (!v || typeof v !== "object") return null;
  const order = (v as { order?: unknown }).order;
  if (!Array.isArray(order)) return null;
  return { order: order.map(String) };
}

function parseNavigationSettings(row: NavLayoutRow | null): NavigationSettings {
  if (!row) return DEFAULT_NAV_SETTINGS;
  const v = row.value as unknown;
  if (!v || typeof v !== "object") return DEFAULT_NAV_SETTINGS;
  
  const settings = v as Partial<NavigationSettings>;
  return {
    position: settings.position || DEFAULT_NAV_SETTINGS.position,
    isFixed: settings.isFixed ?? DEFAULT_NAV_SETTINGS.isFixed,
    isCompact: settings.isCompact ?? DEFAULT_NAV_SETTINGS.isCompact,
  };
}

async function getLayout(key: LayoutKey): Promise<LayoutValue | null> {
  const { data, error } = await supabase
    .from("nav_layout_settings")
    .select("*")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    console.error("navLayoutService:getLayout error", { key, error });
    return null;
  }
  return parseLayoutValue(data ?? null);
}

async function setLayout(key: LayoutKey, value: LayoutValue): Promise<void> {
  const { error } = await supabase.from("nav_layout_settings").upsert(
    {
      key,
      value,
    },
    { onConflict: "key" }
  );

  if (error) {
    console.error("navLayoutService:setLayout error", { key, error });
    throw error;
  }
}

async function getNavigationSettings(): Promise<NavigationSettings> {
  const { data, error } = await supabase
    .from("nav_layout_settings")
    .select("*")
    .eq("key", "navigation_settings")
    .maybeSingle();

  if (error) {
    console.error("navLayoutService:getNavigationSettings error", error);
    return DEFAULT_NAV_SETTINGS;
  }

  return parseNavigationSettings(data);
}

async function setNavigationSettings(settings: NavigationSettings): Promise<void> {
  const { error } = await supabase.from("nav_layout_settings").upsert(
    {
      key: "navigation_settings",
      value: settings as unknown as Record<string, unknown>,
    },
    { onConflict: "key" }
  );

  if (error) {
    console.error("navLayoutService:setNavigationSettings error", error);
    throw error;
  }
}

function applyOrder<T extends { key: string }>(
  items: T[],
  orderedKeys: string[] | null
): T[] {
  if (!orderedKeys || orderedKeys.length === 0) return items;

  const byKey = new Map(items.map((i) => [i.key, i]));
  const out: T[] = [];
  for (const k of orderedKeys) {
    const item = byKey.get(k);
    if (item) out.push(item);
  }
  for (const item of items) {
    if (!out.includes(item)) out.push(item);
  }
  return out;
}

export const navLayoutService = {
  getLayout,
  setLayout,
  applyOrder,
  getNavigationSettings,
  setNavigationSettings,
  DEFAULT_NAV_SETTINGS,
};