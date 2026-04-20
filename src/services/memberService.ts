import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/database.types";

export type Member = Database['public']['Tables']['members']['Row'];
type MemberInsert = Database['public']['Tables']['members']['Insert'];
type MemberUpdate = Database['public']['Tables']['members']['Update'];

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
   * Get member by email (fallback when user_id isn't linked yet)
   */
  async getMemberByEmail(email: string): Promise<Member | null> {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("email", email)
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
      .eq("is_verified", true)
      .order("username")
      .limit(200); // Reduce to 200 for faster initial load

    if (error) throw error;
    return data || [];
  },

  /**
   * Get members with pagination
   */
  async getMembersPaginated(page: number = 1, pageSize: number = 50): Promise<{ data: Member[]; count: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from("members")
      .select("*", { count: "exact" })
      .eq("is_verified", true)
      .order("username")
      .range(from, to);

    if (error) throw error;
    return { data: data || [], count: count || 0 };
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

  /**
   * Get members playing in a specific game
   */
  async getMembersByGameDate(gameId: string): Promise<Member[]> {
    const { data, error } = await supabase
      .from("game_players")
      .select(`
        member_id,
        members (*)
      `)
      .eq("game_id", gameId);

    if (error) throw error;
    
    // Extract members from the joined data
    const members = data
      ?.map((gp: any) => gp.members)
      .filter((m: any) => m != null) as Member[];
    
    return members || [];
  },
};