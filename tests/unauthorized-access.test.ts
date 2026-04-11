import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import {
  supabase,
  signOut,
  globalSetup,
  globalTeardown,
  createTestData,
  cleanupTestData,
} from "./setup";

describe("Unauthorized Access Prevention Tests", () => {
  beforeAll(async () => {
    await globalSetup();
    await createTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await globalTeardown();
  });

  describe("Unauthenticated Access", () => {
    beforeEach(async () => {
      await signOut();
    });

    it("should NOT allow unauthenticated users to read members", async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*");

      expect(data).toEqual([]);
      expect(error).toBeNull(); // RLS returns empty array
    });

    it("should NOT allow unauthenticated users to read chat rooms", async () => {
      const { data, error } = await supabase
        .from("chat_rooms")
        .select("*");

      expect(data).toEqual([]);
      expect(error).toBeNull();
    });

    it("should NOT allow unauthenticated users to read mini bloks", async () => {
      const { data, error } = await supabase
        .from("mini_blok")
        .select("*");

      expect(data).toEqual([]);
      expect(error).toBeNull();
    });

    it("should NOT allow unauthenticated users to insert data", async () => {
      const { data, error } = await supabase
        .from("members")
        .insert({
          phone: "+60111111111",
          full_name: "Unauthorized",
          username: "unauth",
        })
        .select();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.message).toContain("violates row-level security");
    });

    it("should NOT allow unauthenticated users to update data", async () => {
      const { data, error } = await supabase
        .from("members")
        .update({ full_name: "Hacked" })
        .eq("phone", "+60123456790")
        .select();

      expect(data).toEqual([]);
      expect(error).toBeNull(); // RLS silently blocks
    });

    it("should NOT allow unauthenticated users to delete data", async () => {
      const { error } = await supabase
        .from("members")
        .delete()
        .eq("phone", "+60123456790");

      expect(error).toBeDefined();
      expect(error?.message).toContain("violates row-level security");
    });
  });

  describe("SQL Injection Protection", () => {
    beforeEach(async () => {
      await signOut();
    });

    it("should prevent SQL injection in WHERE clauses", async () => {
      const maliciousInput = "1'; DROP TABLE members; --";

      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("full_name", maliciousInput);

      expect(data).toEqual([]);
      expect(error).toBeNull();

      // Verify table still exists
      const { data: members } = await supabase.from("members").select("count");
      expect(members).toBeDefined();
    });

    it("should prevent SQL injection in INSERT values", async () => {
      const maliciousInput = "Test'; DROP TABLE members; --";

      const { data, error } = await supabase
        .from("members")
        .insert({
          phone: "+60999999999",
          full_name: maliciousInput,
          username: "malicious",
        })
        .select();

      // Will fail due to RLS, not SQL injection
      expect(data).toBeNull();

      // Verify table still exists
      const { data: members } = await supabase.from("members").select("count");
      expect(members).toBeDefined();
    });
  });
});