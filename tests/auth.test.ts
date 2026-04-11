import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import {
  supabase,
  signInAs,
  signOut,
  TEST_USERS,
  globalSetup,
  globalTeardown,
} from "./setup";

describe("Authentication Tests", () => {
  beforeAll(async () => {
    await globalSetup();
  });

  afterAll(async () => {
    await globalTeardown();
  });

  describe("Sign In", () => {
    it("should allow admin to sign in", async () => {
      const { user, session } = await signInAs("admin");
      
      expect(user).toBeDefined();
      expect(user.email).toBe(TEST_USERS.admin.email);
      expect(session).toBeDefined();
      expect(session?.access_token).toBeDefined();

      await signOut();
    });

    it("should allow member to sign in", async () => {
      const { user, session } = await signInAs("member");
      
      expect(user).toBeDefined();
      expect(user.email).toBe(TEST_USERS.member.email);
      expect(session).toBeDefined();

      await signOut();
    });

    it("should reject invalid credentials", async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: "nonexistent@test.com",
        password: "WrongPassword123!",
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain("Invalid");
    });
  });

  describe("Session Management", () => {
    it("should maintain session after sign in", async () => {
      await signInAs("member");

      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeDefined();
      expect(session?.user.email).toBe(TEST_USERS.member.email);

      await signOut();
    });

    it("should clear session after sign out", async () => {
      await signInAs("member");
      await signOut();

      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeNull();
    });
  });

  describe("User Roles", () => {
    it("should identify admin user correctly", async () => {
      await signInAs("admin");

      const { data: member } = await supabase
        .from("members")
        .select("is_admin")
        .eq("user_id", (await supabase.auth.getUser()).data.user!.id)
        .single();

      expect(member?.is_admin).toBe(true);

      await signOut();
    });

    it("should identify regular member correctly", async () => {
      await signInAs("member");

      const { data: member } = await supabase
        .from("members")
        .select("is_admin")
        .eq("user_id", (await supabase.auth.getUser()).data.user!.id)
        .single();

      expect(member?.is_admin).toBe(false);

      await signOut();
    });
  });
});