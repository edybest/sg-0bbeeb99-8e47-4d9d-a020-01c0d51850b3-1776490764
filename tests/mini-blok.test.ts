import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import {
  supabase,
  supabaseAdmin,
  signInAs,
  signOut,
  getCurrentMember,
  globalSetup,
  globalTeardown,
  createTestData,
  cleanupTestData,
  testData,
} from "./setup";

describe("Mini Blok RLS Tests", () => {
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

  describe("Mini Blok CRUD", () => {
    it("should allow owners to create mini bloks", async () => {
      await signInAs("member");
      const member = await getCurrentMember();

      const { data, error } = await supabase
        .from("mini_blok")
        .insert({
          title: "Member's Mini Blok",
          owner_id: member!.id,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.title).toBe("Member's Mini Blok");

      // Cleanup
      if (data) {
        await supabaseAdmin.from("mini_blok").delete().eq("id", data.id);
      }

      await signOut();
    });

    it("should allow owners to update their mini bloks", async () => {
      await signInAs("member");

      const { data, error } = await supabase
        .from("mini_blok")
        .update({ title: "Updated Mini Blok" })
        .eq("id", testData.miniBlokId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.title).toBe("Updated Mini Blok");

      // Revert
      await supabase
        .from("mini_blok")
        .update({ title: "Test Mini Blok" })
        .eq("id", testData.miniBlokId);

      await signOut();
    });

    it("should NOT allow non-owners to update mini bloks", async () => {
      await signInAs("member2");

      const { data, error } = await supabase
        .from("mini_blok")
        .update({ title: "Hacked Title" })
        .eq("id", testData.miniBlokId)
        .select();

      expect(data).toEqual([]);
      expect(error).toBeNull(); // RLS silently blocks
    });

    it("should allow admins to update any mini blok", async () => {
      await signInAs("admin");

      const { data, error } = await supabase
        .from("mini_blok")
        .update({ title: "Admin Updated" })
        .eq("id", testData.miniBlokId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.title).toBe("Admin Updated");

      // Revert
      await supabase
        .from("mini_blok")
        .update({ title: "Test Mini Blok" })
        .eq("id", testData.miniBlokId);

      await signOut();
    });

    it("should allow owners to delete their mini bloks", async () => {
      await signInAs("member");
      const member = await getCurrentMember();

      // Create a mini blok
      const { data: miniBlok } = await supabase
        .from("mini_blok")
        .insert({
          title: "To Be Deleted",
          owner_id: member!.id,
        })
        .select()
        .single();

      // Delete it
      const { error } = await supabase
        .from("mini_blok")
        .delete()
        .eq("id", miniBlok!.id);

      expect(error).toBeNull();

      await signOut();
    });
  });

  describe("Mini Blok Collaborators", () => {
    it("should allow owners to add collaborators", async () => {
      await signInAs("member");

      const { data, error } = await supabase
        .from("mini_blok_collaborators")
        .insert({
          mini_blok_id: testData.miniBlokId,
          member_id: testData.member2Id,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.member_id).toBe(testData.member2Id);

      // Cleanup
      if (data) {
        await supabaseAdmin
          .from("mini_blok_collaborators")
          .delete()
          .eq("id", data.id);
      }

      await signOut();
    });

    it("should NOT allow non-owners to add collaborators", async () => {
      await signInAs("member2");

      const { data, error } = await supabase
        .from("mini_blok_collaborators")
        .insert({
          mini_blok_id: testData.miniBlokId,
          member_id: testData.adminId,
        })
        .select();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.message).toContain("violates row-level security");
    });

    it("should allow collaborators to remove themselves", async () => {
      await signInAs("member");

      // Add member2 as collaborator
      const { data: collab } = await supabase
        .from("mini_blok_collaborators")
        .insert({
          mini_blok_id: testData.miniBlokId,
          member_id: testData.member2Id,
        })
        .select()
        .single();

      // Member2 removes themselves
      await signInAs("member2");

      const { error } = await supabase
        .from("mini_blok_collaborators")
        .delete()
        .eq("id", collab!.id);

      expect(error).toBeNull();

      await signOut();
    });

    it("should allow owners to remove collaborators", async () => {
      await signInAs("member");

      // Add member2 as collaborator
      const { data: collab } = await supabase
        .from("mini_blok_collaborators")
        .insert({
          mini_blok_id: testData.miniBlokId,
          member_id: testData.member2Id,
        })
        .select()
        .single();

      // Owner removes collaborator
      const { error } = await supabase
        .from("mini_blok_collaborators")
        .delete()
        .eq("id", collab!.id);

      expect(error).toBeNull();

      await signOut();
    });
  });

  describe("Mini Blok Shares", () => {
    it("should allow owners to create share tokens", async () => {
      await signInAs("member");

      const { data, error } = await supabase
        .from("mini_blok_shares")
        .insert({
          mini_blok_id: testData.miniBlokId,
          token: "test-token-123",
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          created_by_member_id: testData.memberId,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.token).toBe("test-token-123");

      // Cleanup
      if (data) {
        await supabaseAdmin.from("mini_blok_shares").delete().eq("id", data.id);
      }

      await signOut();
    });

    it("should NOT allow non-owners to create share tokens", async () => {
      await signInAs("member2");

      const { data, error } = await supabase
        .from("mini_blok_shares")
        .insert({
          mini_blok_id: testData.miniBlokId,
          token: "unauthorized-token",
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          created_by_member_id: testData.member2Id,
        })
        .select();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.message).toContain("violates row-level security");
    });

    it("should allow owners to delete share tokens", async () => {
      await signInAs("member");

      // Create share token
      const { data: share } = await supabase
        .from("mini_blok_shares")
        .insert({
          mini_blok_id: testData.miniBlokId,
          token: "to-delete-token",
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          created_by_member_id: testData.memberId,
        })
        .select()
        .single();

      // Delete it
      const { error } = await supabase
        .from("mini_blok_shares")
        .delete()
        .eq("id", share!.id);

      expect(error).toBeNull();

      await signOut();
    });
  });
});