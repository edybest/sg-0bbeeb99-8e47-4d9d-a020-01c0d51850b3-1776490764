import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Member = Database["public"]["Tables"]["members"]["Row"];
type MemberInsert = Database["public"]["Tables"]["members"]["Insert"];
type MemberUpdate = Database["public"]["Tables"]["members"]["Update"];

export const memberService = {
  async getAllMembers() {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("full_name");
    
    if (error) throw error;
    return data || [];
  },

  async getMemberById(id: string) {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getMemberByUsername(username: string) {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("username", username)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createMember(member: MemberInsert) {
    const { data, error } = await supabase
      .from("members")
      .insert(member)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateMember(id: string, updates: MemberUpdate) {
    const { data, error } = await supabase
      .from("members")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteMember(id: string) {
    const { error } = await supabase
      .from("members")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
  },

  async searchMembers(query: string) {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
      .order("full_name");
    
    if (error) throw error;
    return data || [];
  },

  async updateAvatar(memberId: string, avatarUrl: string) {
    const { data, error } = await supabase
      .from("members")
      .update({ avatar_url: avatarUrl })
      .eq("id", memberId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};