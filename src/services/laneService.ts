import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type LaneConfiguration = Database["public"]["Tables"]["lane_configurations"]["Row"];
type LaneAssignment = Database["public"]["Tables"]["lane_assignments"]["Row"];
type GamePlayer = Database["public"]["Tables"]["game_players"]["Row"];

export type LaneConfigurationWithDetails = LaneConfiguration;

export interface LaneAssignmentWithMember extends LaneAssignment {
  member: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface RegisteredPlayer {
  member_id: string;
  username: string;
  full_name: string;
}

export const laneService = {
  // Get all lane configurations
  async getLaneConfigurations(): Promise<LaneConfigurationWithDetails[]> {
    const { data, error } = await supabase
      .from("lane_configurations")
      .select("id, lane_sebenar, position_order, created_at, updated_at")
      .order("position_order")
      .limit(20); // Limit to 20 configurations

    if (error) throw error;
    return data || [];
  },

  // Update lane configuration
  async updateLaneConfiguration(
    id: string,
    oldLaneSebenar: string,
    newLaneSebenar: string,
    gameId?: string
  ): Promise<void> {
    const { error } = await supabase
      .from("lane_configurations")
      .update({ lane_sebenar: newLaneSebenar, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    // Migrate assignments and spins so players stay in their slots
    if (oldLaneSebenar && newLaneSebenar && oldLaneSebenar !== newLaneSebenar) {
      const oldLanes = oldLaneSebenar.split("/");
      const newLanes = newLaneSebenar.split("/");

      if (oldLanes.length === 2 && newLanes.length === 2) {
        const oldLeft = oldLanes[0].trim();
        const oldRight = oldLanes[1].trim();
        const newLeft = newLanes[0].trim();
        const newRight = newLanes[1].trim();

        // 1. Update lane_assignments
        let query = supabase.from("lane_assignments").select("*");
        if (gameId) query = query.eq("game_id", gameId);
        
        const { data: assignments } = await query;
        
        if (assignments) {
          for (const assignment of assignments) {
            let newPosition = null;
            const matchOldLeft = ["A", "B", "C"].map(suffix => oldLeft + suffix);
            const matchOldRight = ["A", "B", "C"].map(suffix => oldRight + suffix);

            if (matchOldLeft.includes(assignment.lane_position)) {
              newPosition = newLeft + assignment.lane_position.slice(oldLeft.length);
            } else if (matchOldRight.includes(assignment.lane_position)) {
              newPosition = newRight + assignment.lane_position.slice(oldRight.length);
            }

            if (newPosition) {
              await supabase
                .from("lane_assignments")
                .update({ lane_position: newPosition })
                .eq("id", assignment.id);
            }
          }
        }

        // 2. Update lane_spin_results
        let spinQuery = supabase.from("lane_spin_results").select("*");
        if (gameId) spinQuery = spinQuery.eq("game_id", gameId);
        
        const { data: spins } = await spinQuery;
        
        if (spins) {
          for (const spin of spins) {
            let newPosition = null;
            const matchOldLeft = ["A", "B", "C"].map(suffix => oldLeft + suffix);
            const matchOldRight = ["A", "B", "C"].map(suffix => oldRight + suffix);

            if (matchOldLeft.includes(spin.lane_position)) {
              newPosition = newLeft + spin.lane_position.slice(oldLeft.length);
            } else if (matchOldRight.includes(spin.lane_position)) {
              newPosition = newRight + spin.lane_position.slice(oldRight.length);
            }

            if (newPosition) {
              await supabase
                .from("lane_spin_results")
                .update({ lane_position: newPosition })
                .eq("id", spin.id);
            }
          }
        }
      }
    }
  },

  // Get lane assignments for a specific game
  async getLaneAssignments(gameId: string): Promise<LaneAssignmentWithMember[]> {
    const { data, error } = await supabase
      .from("lane_assignments")
      .select(`
        id,
        game_id,
        member_id,
        lane_position,
        created_at,
        updated_at,
        member:members!lane_assignments_member_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq("game_id", gameId)
      .limit(100); // Limit to 100 assignments

    if (error) throw error;
    return (data || []) as LaneAssignmentWithMember[];
  },

  // Get a member's current assignment (if any) for a game
  async getMemberLaneAssignment(gameId: string, memberId: string): Promise<LaneAssignment | null> {
    const { data, error } = await supabase
      .from("lane_assignments")
      .select("*")
      .eq("game_id", gameId)
      .eq("member_id", memberId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  },

  // Fetch registered players for a game from game_players
  async getRegisteredPlayersForGame(gameId: string): Promise<RegisteredPlayer[]> {
    const { data, error } = await supabase
      .from("game_players")
      .select(`
        member_id,
        member:members!game_players_member_id_fkey(
          username,
          full_name
        )
      `)
      .eq("game_id", gameId);

    if (error) throw error;

    const rows = (data || []) as (GamePlayer & { member?: { username: string; full_name: string } | null })[];

    return rows
      .map((r) => ({
        member_id: r.member_id,
        username: r.member?.username ?? "Unknown",
        full_name: r.member?.full_name ?? "",
      }))
      .sort((a, b) => a.username.localeCompare(b.username));
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
      .order("username")
      .limit(200); // Limit to 200 members for performance

    if (error) throw error;
    return data || [];
  },

  // Check if member is registered (in game_players) for a game
  async isMemberRegisteredForGame(gameId: string, memberId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("game_players")
      .select("member_id")
      .eq("game_id", gameId)
      .eq("member_id", memberId)
      .maybeSingle();

    if (error) throw error;
    return !!data?.member_id;
  },

  // Get registered member ids for a game
  async getRegisteredMemberIdsForGame(gameId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("game_players")
      .select("member_id")
      .eq("game_id", gameId);

    if (error) throw error;
    return (data || []).map((r) => r.member_id);
  },

  // Get assigned lane positions for a game (based on lane_assignments)
  async getAssignedLanePositionsForGame(gameId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("lane_assignments")
      .select("lane_position")
      .eq("game_id", gameId);

    if (error) throw error;
    return (data || []).map((r) => r.lane_position);
  },

  // Get the exact admin-assigned lane positions for wheel segments (sorted)
  async getAdminAssignedLanePositionsForGame(gameId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("lane_assignments")
      .select("lane_position")
      .eq("game_id", gameId)
      .order("lane_position", { ascending: true });

    if (error) throw error;
    return (data || []).map((r) => r.lane_position);
  },

  // Delete a spin result
  async deleteSpinResult(spinId: string): Promise<void> {
    const { error } = await supabase
      .from("lane_spin_results")
      .delete()
      .eq("id", spinId);

    if (error) throw error;
  },

  // Subscribe to lane spin changes
  subscribeLaneSpins(gameId: string, callback: (payload: any) => void) {
  },
};