import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import {
  supabase,
  supabaseAdmin,
  signInAs,
  signOut,
  globalSetup,
  globalTeardown,
  createTestData,
  cleanupTestData,
  testData,
} from "./setup";

describe("Admin Access RLS Tests", () => {
  beforeAll(async () => {
    await globalSetup();
    await createTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await globalTeardown();
  });

  beforeEach(async () => {
    await signOut();
  });

  describe("Admin-Only Operations", () => {
    const adminOnlyTables = [
      "club_settings",
      "comment_bans",
      "fivefive_games",
      "fivefive_participants",
      "fivefive_prizes",
      "games",
      "lane_configurations",
      "page_access_control",
    ];

    adminOnlyTables.forEach((tableName) => {
      describe(`${tableName} table`, () => {
        it("should allow admins to insert", async () => {
          await signInAs("admin");

          // Prepare minimal valid data for each table
          const mockData: Record<string, any> = {
            club_settings: { key: `test_${Date.now()}`, value: "test" },
            comment_bans: { member_id: testData.memberId, room_id: testData.chatRoomId },
            fivefive_games: { name: "Test Game", date: new Date().toISOString() },
            fivefive_participants: { member_id: testData.memberId, game_id: "00000000-0000-0000-0000-000000000000" },
            fivefive_prizes: { game_id: "00000000-0000-0000-0000-000000000000", position: 1, amount: 100 },
            games: { title: "Test Game", date: new Date().toISOString() },
            lane_configurations: { name: "Test Lane", lane_number: 1 },
            page_access_control: { member_id: testData.memberId, page_name: "test" },
          };

          const { data, error } = await supabase
            .from(tableName)
            .insert(mockData[tableName])
            .select()
            .single();

          expect(error).toBeNull();
          expect(data).toBeDefined();

          // Cleanup
          if (data) {
            await supabaseAdmin.from(tableName).delete().eq("id", data.id);
          }

          await signOut();
        });

        it("should NOT allow regular members to insert", async () => {
          await signInAs("member");

          const mockData: Record<string, any> = {
            club_settings: { key: `test_${Date.now()}`, value: "test" },
            comment_bans: { member_id: testData.memberId, room_id: testData.chatRoomId },
            fivefive_games: { name: "Test Game", date: new Date().toISOString() },
            fivefive_participants: { member_id: testData.memberId, game_id: "00000000-0000-0000-0000-000000000000" },
            fivefive_prizes: { game_id: "00000000-0000-0000-0000-000000000000", position: 1, amount: 100 },
            games: { title: "Test Game", date: new Date().toISOString() },
            lane_configurations: { name: "Test Lane", lane_number: 1 },
            page_access_control: { member_id: testData.memberId, page_name: "test" },
          };

          const { data, error } = await supabase
            .from(tableName)
            .insert(mockData[tableName])
            .select();

          expect(data).toBeNull();
          expect(error).toBeDefined();
          expect(error?.message).toContain("violates row-level security");

          await signOut();
        });
      });
    });
  });

  describe("Admin Override on Member-Owned Data", () => {
    it("should allow admin to update any member feedback", async () => {
      // Create feedback as member
      await signInAs("member");
      const { data: feedback } = await supabase
        .from("member_feedback")
        .insert({
          message: "Test feedback",
          category: "general",
          subject: "Test",
          member_id: testData.memberId,
        })
        .select()
        .single();

      // Admin updates it
      await signInAs("admin");
      const { data, error } = await supabase
        .from("member_feedback")
        .update({ message: "Admin updated feedback" })
        .eq("id", feedback!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.message).toBe("Admin updated feedback");

      // Cleanup
      await supabaseAdmin.from("member_feedback").delete().eq("id", feedback!.id);

      await signOut();
    });

    it("should allow admin to delete any training score", async () => {
      await signInAs("admin");

      // Create a training score
      const { data: score } = await supabase
        .from("training_scores")
        .insert({
          member_id: testData.memberId,
          score: 150,
        })
        .select()
        .single();

      // Admin deletes it
      const { error } = await supabase
        .from("training_scores")
        .delete()
        .eq("id", score!.id);

      expect(error).toBeNull();

      await signOut();
    });

    it("should allow admin to manage any couple", async () => {
      await signInAs("admin");

      // Create a couple
      const { data: couple } = await supabase
        .from("couples")
        .insert({
          player1_id: testData.memberId,
          player2_id: testData.member2Id,
          couple_name: "Test Couple",
        })
        .select()
        .single();

      expect(couple).toBeDefined();

      // Update it
      const { error: updateError } = await supabase
        .from("couples")
        .update({ couple_name: "Updated Couple" })
        .eq("id", couple!.id);

      expect(updateError).toBeNull();

      // Delete it
      const { error: deleteError } = await supabase
        .from("couples")
        .delete()
        .eq("id", couple!.id);

      expect(deleteError).toBeNull();

      await signOut();
    });
  });
});