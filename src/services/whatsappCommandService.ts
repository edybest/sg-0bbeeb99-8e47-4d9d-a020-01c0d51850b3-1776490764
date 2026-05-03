import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type WhatsAppCommand = Database["public"]["Tables"]["whatsapp_commands"]["Row"];
type WhatsAppCommandInsert = Database["public"]["Tables"]["whatsapp_commands"]["Insert"];
type WhatsAppCommandUpdate = Database["public"]["Tables"]["whatsapp_commands"]["Update"];

export async function getAllCommands(): Promise<WhatsAppCommand[]> {
  const { data, error } = await supabase
    .from("whatsapp_commands")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching WhatsApp commands:", error);
    throw error;
  }

  return data || [];
}

export async function getActiveCommands(): Promise<WhatsAppCommand[]> {
  const { data, error } = await supabase
    .from("whatsapp_commands")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching active WhatsApp commands:", error);
    throw error;
  }

  return data || [];
}

export async function getCommandByTrigger(trigger: string): Promise<WhatsAppCommand | null> {
  const { data, error } = await supabase
    .from("whatsapp_commands")
    .select("*")
    .eq("command_trigger", trigger.toLowerCase())
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching WhatsApp command:", error);
    return null;
  }

  return data;
}

export async function createCommand(command: WhatsAppCommandInsert): Promise<WhatsAppCommand> {
  const { data, error } = await supabase
    .from("whatsapp_commands")
    .insert({
      ...command,
      command_trigger: command.command_trigger.toLowerCase(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating WhatsApp command:", error);
    throw error;
  }

  return data;
}

export async function updateCommand(id: string, updates: WhatsAppCommandUpdate): Promise<WhatsAppCommand> {
  const { data, error } = await supabase
    .from("whatsapp_commands")
    .update({
      ...updates,
      command_trigger: updates.command_trigger ? updates.command_trigger.toLowerCase() : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating WhatsApp command:", error);
    throw error;
  }

  return data;
}

export async function deleteCommand(id: string): Promise<void> {
  const { error } = await supabase
    .from("whatsapp_commands")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting WhatsApp command:", error);
    throw error;
  }
}

export async function toggleCommandStatus(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from("whatsapp_commands")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error toggling WhatsApp command status:", error);
    throw error;
  }
}