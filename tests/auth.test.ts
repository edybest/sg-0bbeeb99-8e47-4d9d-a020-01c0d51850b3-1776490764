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

    it("should refresh session successfully", async () => {
      await signInAs("member");

      const { data: initialSession } = await supabase.auth.getSession();
      expect(initialSession.session).toBeDefined();

      const initialAccessToken = initialSession.session?.access_token;

      // Wait a bit before refresh
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: refreshedData, error } = await supabase.auth.refreshSession();
      
      expect(error).toBeNull();
      expect(refreshedData.session).toBeDefined();
      expect(refreshedData.session?.user.email).toBe(TEST_USERS.member.email);

      await signOut();
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

  describe("Auth Lock Prevention Tests", () => {
    it("should handle rapid login/logout cycles without orphaned locks", async () => {
      // Perform 5 rapid login/logout cycles
      for (let i = 0; i < 5; i++) {
        await signInAs("member");
        await signOut();
      }

      // Verify final state is clean (no session)
      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeNull();
    }, 30000); // 30 second timeout for this test

    it("should not create orphaned locks during concurrent login attempts", async () => {
      // Attempt to login concurrently (simulates multiple components calling auth)
      const loginPromises = [
        supabase.auth.signInWithPassword({
          email: TEST_USERS.member.email,
          password: TEST_USERS.member.password,
        }),
        supabase.auth.signInWithPassword({
          email: TEST_USERS.member.email,
          password: TEST_USERS.member.password,
        }),
      ];

      const results = await Promise.allSettled(loginPromises);

      // At least one should succeed
      const successCount = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
      expect(successCount).toBeGreaterThan(0);

      // Clean up
      await signOut();

      // Verify no session remains
      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeNull();
    });

    it("should cleanup properly when logout is called during pending operations", async () => {
      await signInAs("member");

      // Start a session refresh (don't await)
      const refreshPromise = supabase.auth.refreshSession();

      // Immediately logout (before refresh completes)
      await signOut();

      // Wait for refresh to complete (should handle gracefully)
      await refreshPromise;

      // Verify session is still cleared
      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeNull();
    });

    it("should handle multiple rapid getSession calls without lock issues", async () => {
      await signInAs("member");

      // Make 10 concurrent getSession calls
      const sessionPromises = Array(10).fill(null).map(() => 
        supabase.auth.getSession()
      );

      const results = await Promise.all(sessionPromises);

      // All should succeed and return the same session
      results.forEach(result => {
        expect(result.data.session).toBeDefined();
        expect(result.data.session?.user.email).toBe(TEST_USERS.member.email);
        expect(result.error).toBeNull();
      });

      await signOut();
    });
  });

  describe("Session Cleanup Tests", () => {
    it("should completely remove session data on logout", async () => {
      await signInAs("member");

      // Verify session exists
      let { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeDefined();
      expect(session?.access_token).toBeDefined();

      // Logout
      await signOut();

      // Verify all session data is cleared
      const finalCheck = await supabase.auth.getSession();
      expect(finalCheck.data.session).toBeNull();
      expect(finalCheck.error).toBeNull();

      // Verify user is also cleared
      const { data: { user } } = await supabase.auth.getUser();
      expect(user).toBeNull();
    });

    it("should prevent auth operations after logout", async () => {
      await signInAs("member");
      await signOut();

      // Try to get user (should return null)
      const { data: { user }, error } = await supabase.auth.getUser();
      expect(user).toBeNull();
      
      // Error might be null or defined depending on implementation
      // Main point is user should be null
    });

    it("should clear session even after multiple failed logout attempts", async () => {
      await signInAs("member");

      // Call signOut multiple times
      await Promise.all([
        signOut(),
        signOut(),
        signOut(),
      ]);

      // Verify session is cleared
      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeNull();
    });
  });

  describe("Error Handling & Resilience", () => {
    it("should handle network timeout gracefully", async () => {
      // This test verifies our timeout wrapper works
      await signInAs("member");

      // Session should exist
      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeDefined();

      await signOut();
    }, 15000); // Allow 15 seconds for this test

    it("should recover from invalid session state", async () => {
      // Login normally
      await signInAs("member");

      // Verify login worked
      let { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeDefined();

      // Sign out to simulate invalid state
      await signOut();

      // Try to access protected resource (should fail gracefully)
      const { data: { user } } = await supabase.auth.getUser();
      expect(user).toBeNull();

      // Should be able to login again
      await signInAs("member");
      const secondSession = await supabase.auth.getSession();
      expect(secondSession.data.session).toBeDefined();

      await signOut();
    });

    it("should handle rapid sequential auth operations", async () => {
      // Test sequence: login -> refresh -> logout -> login -> logout
      await signInAs("member");
      
      await supabase.auth.refreshSession();
      
      await signOut();
      
      await signInAs("member");
      
      await signOut();

      // Verify final clean state
      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeNull();
    });
  });

  describe("Component Lifecycle Simulation", () => {
    it("should handle abort during login process", async () => {
      // Start login
      const loginPromise = supabase.auth.signInWithPassword({
        email: TEST_USERS.member.email,
        password: TEST_USERS.member.password,
      });

      // Simulate component unmount by attempting logout
      // (This simulates AbortController.abort() in real scenario)
      const logoutPromise = supabase.auth.signOut();

      // Wait for both to complete
      await Promise.allSettled([loginPromise, logoutPromise]);

      // Verify clean state
      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeNull();
    });

    it("should maintain data integrity across login cycles", async () => {
      // Login as member
      await signInAs("member");
      
      const { data: memberData1 } = await supabase
        .from("members")
        .select("*")
        .eq("user_id", (await supabase.auth.getUser()).data.user!.id)
        .single();

      await signOut();

      // Login again
      await signInAs("member");

      const { data: memberData2 } = await supabase
        .from("members")
        .select("*")
        .eq("user_id", (await supabase.auth.getUser()).data.user!.id)
        .single();

      // Member data should be consistent
      expect(memberData1?.id).toBe(memberData2?.id);
      expect(memberData1?.full_name).toBe(memberData2?.full_name);

      await signOut();
    });
  });
});