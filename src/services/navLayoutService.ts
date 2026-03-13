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

export type LayoutKey = "member_dashboard_cards" | "member_menu";

export type LayoutValue = {
  order: string[];
};

function parseLayoutValue(row: NavLayoutRow | null): LayoutValue | null {
  if (!row) return null;
  const v = row.value as unknown;
  if (!v || typeof v !== "object") return null;
  const order = (v as { order?: unknown }).order;
  if (!Array.isArray(order)) return null;
  return { order: order.map(String) };
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
};