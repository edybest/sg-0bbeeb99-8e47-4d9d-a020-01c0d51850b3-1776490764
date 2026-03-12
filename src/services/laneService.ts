import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type LaneConfiguration = Database["public"]["Tables"]["lane_configurations"]["Row"];
type LaneAssignment = Database["public"]["Tables"]["lane_assignments"]["Row"];

export type LaneConfigurationWithDetails = LaneConfiguration;

export interface LaneAssignmentWithMember extends LaneAssignment {
  member: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export const laneService = {
  // Get all lane configurations
  async getLaneConfigurations(): Promise<LaneConfigurationWithDetails[]> {
    const { data, error } = await supabase
      .from("lane_configurations")
      .select("*")
      .order("position_order");

    if (error) throw error;
    return data || [];
  },

  // Update lane configuration
  async updateLaneConfiguration(
    id: string,
    laneSebenar: string
  ): Promise<void> {
    const { error } = await supabase
      .from("lane_configurations")
      .update({ lane_sebenar: laneSebenar, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
  },

  // Get lane assignments for a specific game
  async getLaneAssignments(gameId: string): Promise<LaneAssignmentWithMember[]> {
    const { data, error } = await supabase
      .from("lane_assignments")
      .select(`
        *,
        member:members!lane_assignments_member_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq("game_id", gameId);

    if (error) throw error;
    return (data || []) as LaneAssignmentWithMember[];
  },

  // Assign member to lane
  async assignMemberToLane(
    gameId: string,
    memberId: string,
    lanePosition: string
  ): Promise<void> {
    // Check if member already assigned to this game
    const { data: existing } = await supabase
      .from("lane_assignments")
      .select("id")
      .eq("game_id", gameId)
      .eq("member_id", memberId)
      .maybeSingle();

    if (existing) {
      // Update existing assignment
      const { error } = await supabase
        .from("lane_assignments")
        .update({ lane_position: lanePosition, updated_at: new Date().toISOString() })
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      // Create new assignment
      const { error } = await supabase
        .from("lane_assignments")
        .insert({
          game_id: gameId,
          member_id: memberId,
          lane_position: lanePosition,
        });

      if (error) throw error;
    }
  },

  // Upsert lane assignment derived from a spin result (member flow)
  async upsertLaneAssignmentFromSpin(
    gameId: string,
    memberId: string,
    lanePosition: string
  ): Promise<void> {
    await this.assignMemberToLane(gameId, memberId, lanePosition);
  },

  // Remove member from lane
  async removeMemberFromLane(gameId: string, memberId: string): Promise<void> {
    const { error } = await supabase
      .from("lane_assignments")
      .delete()
      .eq("game_id", gameId)
      .eq("member_id", memberId);

    if (error) throw error;
  },

  // Get all members for drag and drop
  async getAllMembers() {
    const { data, error } = await supabase
      .from("members")
      .select("id, username, full_name, avatar_url")
      .eq("is_verified", true)
      .order("username");

    if (error) throw error;
    return data || [];
  },
};