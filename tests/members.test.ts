import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import {
  supabase,
  signInAs,
  signOut,
  getCurrentMember,
  globalSetup,
  globalTeardown,
  createTestData,
  cleanupTestData,
  testData,
} from "./setup";

describe("Members Table RLS Tests", () => {
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

  describe("SELECT Policies", () => {
    it("should allow members to view all member profiles", async () => {
      await signInAs("member");

      const { data, error } = await supabase
        .from("members")
        .select("id, name, phone_number");

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(0);

      await signOut();
    });

    it("should NOT allow unauthenticated users to view members", async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, name");

      expect(data).toEqual([]);
      expect(error).toBeNull(); // RLS returns empty array, not error
    });
  });

  describe("UPDATE Policies", () => {
    it("should allow members to update their own profile", async () => {
      await signInAs("member");
      const member = await getCurrentMember();

      const { data, error } = await supabase
        .from("members")
        .update({ name: "Updated Name" })
        .eq("id", member!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.name).toBe("Updated Name");

      // Revert change
      await supabase
        .from("members")
        .update({ name: "Test member" })
        .eq("id", member!.id);

      await signOut();
    });

    it("should NOT allow members to update other members", async () => {
      await signInAs("member");

      const { data, error } = await supabase
        .from("members")
        .update({ name: "Hacked Name" })
        .eq("id", testData.member2Id)
        .select();

      expect(data).toEqual([]);
      expect(error).toBeNull(); // RLS silently blocks
    });

    it("should allow admins to update any member", async () => {
      await signInAs("admin");

      const { data, error } = await supabase
        .from("members")
        .update({ name: "Admin Updated" })
        .eq("id", testData.memberId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.name).toBe("Admin Updated");

      // Revert change
      await supabase
        .from("members")
        .update({ name: "Test member" })
        .eq("id", testData.memberId);

      await signOut();
    });
  });

  describe("INSERT Policies", () => {
    it("should allow admins to create members", async () => {
      await signInAs("admin");

      const { data, error } = await supabase
        .from("members")
        .insert({
          phone_number: "+60123456999",
          name: "New Test Member",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.name).toBe("New Test Member");

      // Cleanup
      if (data) {
        await supabase.from("members").delete().eq("id", data.id);
      }

      await signOut();
    });

    it("should NOT allow regular members to create members", async () => {
      await signInAs("member");

      const { data, error } = await supabase
        .from("members")
        .insert({
          phone_number: "+60123456998",
          name: "Unauthorized Member",
        })
        .select();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.message).toContain("violates row-level security");
    });
  });

  describe("DELETE Policies", () => {
    it("should allow admins to delete members", async () => {
      await signInAs("admin");

      // Create a test member first
      const { data: newMember } = await supabase
        .from("members")
        .insert({
          phone_number: "+60123456997",
          name: "To Be Deleted",
        })
        .select()
        .single();

      // Delete it
      const { error } = await supabase
        .from("members")
        .delete()
        .eq("id", newMember!.id);

      expect(error).toBeNull();

      await signOut();
    });

    it("should NOT allow regular members to delete members", async () => {
      await signInAs("member");

      const { error } = await supabase
        .from("members")
        .delete()
        .eq("id", testData.member2Id);

      expect(error).toBeDefined();
      expect(error?.message).toContain("violates row-level security");
    });
  });
});