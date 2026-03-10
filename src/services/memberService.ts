import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Member = Tables<"members">;
type MemberInsert = TablesInsert<"members">;
type MemberUpdate = TablesUpdate<"members">;

export const memberService = {
  /**
   * Get member by ID
   */
  async getMemberById(id: string): Promise<Member> {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) throw new Error("Member not found");
    
    return data;
  },

  /**
   * Get member by user_id (Supabase Auth ID)
   */
  async getMemberByUserId(userId: string): Promise<Member | null> {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Get member by phone number
   */
  async getMemberByPhone(phone: string): Promise<Member | null> {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Get all members
   */
  async getAllMembers(): Promise<Member[]> {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("username");

    if (error) throw error;
    return data || [];
  },

  /**
   * Create new member
   */
  async createMember(member: MemberInsert): Promise<Member> {
    const { data, error } = await supabase
      .from("members")
      .insert(member)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error("Failed to create member");
    
    return data;
  },

  /**
   * Update member
   */
  async updateMember(id: string, updates: MemberUpdate): Promise<Member> {
    const { data, error } = await supabase
      .from("members")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error("Failed to update member");
    
    return data;
  },

  /**
   * Delete member
   */
  async deleteMember(id: string): Promise<void> {
    const { error } = await supabase
      .from("members")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Link member to Supabase Auth user
   */
  async linkAuthUser(memberId: string, userId: string): Promise<Member> {
    return this.updateMember(memberId, { user_id: userId });
  },
};