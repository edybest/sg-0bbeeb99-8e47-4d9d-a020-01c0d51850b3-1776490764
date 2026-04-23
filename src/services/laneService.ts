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
      .select("*")
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
        couple_id,
        lane_position,
        created_at,
        updated_at,
        member:members!lane_assignments_member_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        ),
        couple:couples!lane_assignments_couple_id_fkey(
          id,
          couple_name,
          player1_id,
          player2_id,
          player1:members!couples_player1_id_fkey(username, full_name),
          player2:members!couples_player2_id_fkey(username, full_name)
        )
      `)
      .eq("game_id", gameId)
      .limit(100); // Limit to 100 assignments

    if (error) throw error;
    return (data || []) as any;
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
    lanePosition: string,
    coupleId?: string
  ): Promise<void> {
    // Check if assignment already exists for this game and lane position
    const { data: existing } = await supabase
      .from("lane_assignments")
      .select("id")
      .eq("game_id", gameId)
      .eq("lane_position", lanePosition)
      .maybeSingle();

    if (existing) {
      // Update existing assignment
      const updateData: any = {
        lane_position: lanePosition,
        updated_at: new Date().toISOString()
      };
      
      if (coupleId) {
        // Couple game - use couple_id
        updateData.couple_id = coupleId;
        updateData.member_id = null;
      } else {
        // Individual game - use member_id
        updateData.member_id = memberId;
        updateData.couple_id = null;
      }

      const { error } = await supabase
        .from("lane_assignments")
        .update(updateData)
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      // Create new assignment
      const insertData: any = {
        game_id: gameId,
        lane_position: lanePosition,
      };
      
      if (coupleId) {
        // Couple game - use couple_id
        insertData.couple_id = coupleId;
        insertData.member_id = null;
      } else {
        // Individual game - use member_id
        insertData.member_id = memberId;
        insertData.couple_id = null;
      }

      const { error } = await supabase
        .from("lane_assignments")
        .insert(insertData);

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
  async removeMemberFromLane(gameId: string, memberId: string, coupleId?: string): Promise<void> {
    let query = supabase
      .from("lane_assignments")
      .delete()
      .eq("game_id", gameId);
    
    if (coupleId) {
      query = query.eq("couple_id", coupleId);
    } else {
      query = query.eq("member_id", memberId);
    }

    const { error } = await query;
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
    // First check if this is a COUPLE game by looking at lane_assignments
    const { data: assignments } = await supabase
      .from("lane_assignments")
      .select("member_id, couple_id")
      .eq("game_id", gameId)
      .limit(1);

    if (!assignments || assignments.length === 0) {
      // No assignments yet, fallback to game_players check
      const { data, error } = await supabase
        .from("game_players")
        .select("member_id")
        .eq("game_id", gameId)
        .eq("member_id", memberId)
        .maybeSingle();

      if (error) throw error;
      return !!data?.member_id;
    }

    // Check if this is a COUPLE game (has couple_id assignments)
    const hasCoupleAssignments = assignments.some(a => a.couple_id !== null);

    if (hasCoupleAssignments) {
      // COUPLE game - check if member is player1 or player2 in any couple assigned to this game
      const { data: coupleAssignments } = await supabase
        .from("lane_assignments")
        .select(`
          couple_id,
          couple:couples!lane_assignments_couple_id_fkey(
            id,
            player1_id,
            player2_id
          )
        `)
        .eq("game_id", gameId)
        .not("couple_id", "is", null);

      if (coupleAssignments) {
        // Check if member is player1 or player2 in any of these couples
        return coupleAssignments.some((assignment: any) => {
          const couple = assignment.couple;
          return couple && (couple.player1_id === memberId || couple.player2_id === memberId);
        });
      }
      return false;
    } else {
      // BLOK/Individual game - check member_id directly
      const { data, error } = await supabase
        .from("lane_assignments")
        .select("member_id")
        .eq("game_id", gameId)
        .eq("member_id", memberId)
        .maybeSingle();

      if (error) throw error;
      return !!data?.member_id;
    }
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

  // Get all assignments for a game (lighter version without joins)
  async getAllLaneAssignmentsForGame(gameId: string) {
    const { data, error } = await supabase
      .from("lane_assignments")
      .select("*")
      .eq("game_id", gameId);

    if (error) throw error;
    return data || [];
  },

  // Get a couple's current assignment (if any) for a game
  async getCoupleLaneAssignment(gameId: string, coupleId: string) {
    const { data, error } = await supabase
      .from("lane_assignments")
      .select("*")
      .eq("game_id", gameId)
      .eq("couple_id", coupleId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  },

  // Upsert lane assignment derived from a spin result (couple flow)
  async upsertCoupleLaneAssignmentFromSpin(
    gameId: string,
    coupleId: string,
    lanePosition: string
  ): Promise<void> {
    await this.assignMemberToLane(gameId, "", lanePosition, coupleId);
  },

  async getCoupleByPlayerAndGame(playerId: string, gameId: string) {
    // CRITICAL FIX: Fetch all couple_scores for the game first, then filter locally
    // because Supabase .or() with foreign tables is not natively supported and causes syntax errors
    const { data: coupleScores, error: scoreError } = await supabase
      .from("couple_scores")
      .select(`
        couple_id,
        couple:couples!couple_scores_couple_id_fkey(
          id,
          couple_name,
          player1_id,
          player2_id,
          player1:members!couples_player1_id_fkey(id, username, full_name),
          player2:members!couples_player2_id_fkey(id, username, full_name)
        )
      `)
      .eq("game_id", gameId);
      
    if (scoreError) {
      console.error("Error fetching couple from couple_scores:", scoreError);
      throw scoreError;
    }
    
    if (!coupleScores || coupleScores.length === 0) return null;
    
    // Filter locally to find the couple where player is player1 or player2
    const matchedScore = coupleScores.find((score: any) => {
      return score.couple && (score.couple.player1_id === playerId || score.couple.player2_id === playerId);
    });
    
    if (!matchedScore || !matchedScore.couple) return null;
    
    // Return the couple registered for this specific game
    return {
      couple_id: matchedScore.couple_id,
      couple: matchedScore.couple
    };
  },

  async checkIfPartnerAlreadyDrawn(coupleId: string, gameId: string) {
    // Check if any player from this couple has already drawn a lane
    const { data: couple } = await supabase
      .from("couples")
      .select("player1_id, player2_id")
      .eq("id", coupleId)
      .single();

    if (!couple) return false;

    // We check lane_spin_results because the "undi" action creates a row there
    const { data, error } = await supabase
      .from("lane_spin_results")
      .select("id")
      .eq("game_id", gameId)
      .in("member_id", [couple.player1_id, couple.player2_id])
      .limit(1);

    if (error) throw error;
    return (data && data.length > 0);
  },

  async getUnsortedMembers(gameId: string): Promise<Array<{ id: string; username: string; full_name: string; avatar_url: string | null }>> {
    console.log("🔍 Fetching unsorted members for game:", gameId);
    
    // 1. Get all players who joined this game
    const { data: gamePlayers, error: gamePlayersError } = await supabase
      .from("game_players")
      .select(`
        member_id,
        members!game_players_member_id_fkey (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq("game_id", gameId);

    if (gamePlayersError) {
      console.error("❌ Error fetching game players:", gamePlayersError);
      throw gamePlayersError;
    }

    console.log("👥 Game players found:", gamePlayers?.length || 0);

    // 2. Get members already assigned to lanes for this game
    const { data: laneAssignments, error: laneError } = await supabase
      .from("lane_assignments")
      .select("member_id")
      .eq("game_id", gameId)
      .not("member_id", "is", null);

    if (laneError) {
      console.error("❌ Error fetching lane assignments:", laneError);
      throw laneError;
    }

    const assignedMemberIds = (laneAssignments || []).map((l) => l.member_id);
    console.log("📊 Already assigned to lanes:", assignedMemberIds.length, "members");

    // 3. Filter: players who joined game but NOT assigned to lanes yet
    const unsorted = (gamePlayers || [])
      .filter((gp) => gp.member_id && !assignedMemberIds.includes(gp.member_id))
      .map((gp) => ({
        id: gp.members?.id || "",
        username: gp.members?.username || "",
        full_name: gp.members?.full_name || "",
        avatar_url: gp.members?.avatar_url || null,
      }))
      .filter((m) => m.id); // Remove empty entries

    console.log("✅ Unsorted members (joined game but no lane):", unsorted.length);
    
    return unsorted;
  },

  async drawLane(gameId: string, memberId: string) {
  },
};