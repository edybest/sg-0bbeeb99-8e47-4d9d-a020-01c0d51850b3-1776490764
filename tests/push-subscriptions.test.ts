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

describe("Push Subscriptions RLS Tests", () => {
  let testSubscriptionId: string;

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
    // Clean up any test subscriptions
    if (testSubscriptionId) {
      await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .eq("id", testSubscriptionId);
      testSubscriptionId = "";
    }
  });

  describe("SELECT Policies", () => {
    it("should allow users to view their own subscriptions", async () => {
      await signInAs("member");
      const member = await getCurrentMember();

      // Create a subscription for the member
      const { data: subscription } = await supabaseAdmin
        .from("push_subscriptions")
        .insert({
          member_id: member!.id,
          endpoint: "https://test.endpoint/subscription1",
          p256dh_key: "test-p256dh-key-1",
          auth_key: "test-auth-key-1",
        })
        .select()
        .single();

      testSubscriptionId = subscription!.id;

      // Member should see their own subscription
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("id", subscription!.id);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBe(1);
      expect(data![0].endpoint).toBe("https://test.endpoint/subscription1");

      await signOut();
    });

    it("should NOT allow users to view other users' subscriptions", async () => {
      await signInAs("member");

      // Create a subscription for member2
      const { data: subscription } = await supabaseAdmin
        .from("push_subscriptions")
        .insert({
          member_id: testData.member2Id,
          endpoint: "https://test.endpoint/subscription2",
          p256dh_key: "test-p256dh-key-2",
          auth_key: "test-auth-key-2",
        })
        .select()
        .single();

      testSubscriptionId = subscription!.id;

      // Member should NOT see member2's subscription
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("id", subscription!.id);

      expect(error).toBeNull();
      expect(data).toEqual([]);

      await signOut();
    });

    it("should allow admins to view all subscriptions", async () => {
      await signInAs("admin");

      // Create subscriptions for different members
      const { data: sub1 } = await supabaseAdmin
        .from("push_subscriptions")
        .insert({
          member_id: testData.memberId,
          endpoint: "https://test.endpoint/admin-view-1",
          p256dh_key: "test-p256dh-key-3",
          auth_key: "test-auth-key-3",
        })
        .select()
        .single();

      const { data: sub2 } = await supabaseAdmin
        .from("push_subscriptions")
        .insert({
          member_id: testData.member2Id,
          endpoint: "https://test.endpoint/admin-view-2",
          p256dh_key: "test-p256dh-key-4",
          auth_key: "test-auth-key-4",
        })
        .select()
        .single();

      // Admin should see all subscriptions
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("*")
        .in("id", [sub1!.id, sub2!.id]);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBe(2);

      // Cleanup
      await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub1!.id);
      await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub2!.id);

      await signOut();
    });

    it("should NOT allow unauthenticated users to view subscriptions", async () => {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("*");

      expect(data).toEqual([]);
      expect(error).toBeNull(); // RLS returns empty array
    });
  });

  describe("INSERT Policies", () => {
    it("should allow users to create their own subscriptions", async () => {
      await signInAs("member");
      const member = await getCurrentMember();

      const { data, error } = await supabase
        .from("push_subscriptions")
        .insert({
          member_id: member!.id,
          endpoint: "https://test.endpoint/member-insert",
          p256dh_key: "test-p256dh-key-5",
          auth_key: "test-auth-key-5",
          user_agent: "Test Browser",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.endpoint).toBe("https://test.endpoint/member-insert");

      testSubscriptionId = data!.id;

      await signOut();
    });

    it("should NOT allow users to create subscriptions for other members", async () => {
      await signInAs("member");

      const { data, error } = await supabase
        .from("push_subscriptions")
        .insert({
          member_id: testData.member2Id,
          endpoint: "https://test.endpoint/unauthorized-insert",
          p256dh_key: "test-p256dh-key-6",
          auth_key: "test-auth-key-6",
        })
        .select();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.message).toContain("violates row-level security");

      await signOut();
    });

    it("should allow admins to create subscriptions for any member", async () => {
      await signInAs("admin");

      const { data, error } = await supabase
        .from("push_subscriptions")
        .insert({
          member_id: testData.memberId,
          endpoint: "https://test.endpoint/admin-insert",
          p256dh_key: "test-p256dh-key-7",
          auth_key: "test-auth-key-7",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();

      testSubscriptionId = data!.id;

      await signOut();
    });

    it("should NOT allow unauthenticated users to create subscriptions", async () => {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .insert({
          member_id: testData.memberId,
          endpoint: "https://test.endpoint/unauth-insert",
          p256dh_key: "test-p256dh-key-8",
          auth_key: "test-auth-key-8",
        })
        .select();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.message).toContain("violates row-level security");
    });
  });

  describe("UPDATE Policies", () => {
    it("should allow users to update their own subscriptions", async () => {
      await signInAs("member");
      const member = await getCurrentMember();

      // Create a subscription
      const { data: subscription } = await supabase
        .from("push_subscriptions")
        .insert({
          member_id: member!.id,
          endpoint: "https://test.endpoint/original",
          p256dh_key: "test-p256dh-key-9",
          auth_key: "test-auth-key-9",
        })
        .select()
        .single();

      testSubscriptionId = subscription!.id;

      // Update it
      const { data, error } = await supabase
        .from("push_subscriptions")
        .update({ endpoint: "https://test.endpoint/updated" })
        .eq("id", subscription!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.endpoint).toBe("https://test.endpoint/updated");

      await signOut();
    });

    it("should NOT allow users to update other users' subscriptions", async () => {
      await signInAs("member");

      // Create a subscription for member2
      const { data: subscription } = await supabaseAdmin
        .from("push_subscriptions")
        .insert({
          member_id: testData.member2Id,
          endpoint: "https://test.endpoint/member2-original",
          p256dh_key: "test-p256dh-key-10",
          auth_key: "test-auth-key-10",
        })
        .select()
        .single();

      testSubscriptionId = subscription!.id;

      // Try to update it as member
      const { data, error } = await supabase
        .from("push_subscriptions")
        .update({ endpoint: "https://test.endpoint/hacked" })
        .eq("id", subscription!.id)
        .select();

      expect(data).toEqual([]);
      expect(error).toBeNull(); // RLS silently blocks

      await signOut();
    });

    it("should allow admins to update any subscription", async () => {
      await signInAs("admin");

      // Create a subscription for a member
      const { data: subscription } = await supabaseAdmin
        .from("push_subscriptions")
        .insert({
          member_id: testData.memberId,
          endpoint: "https://test.endpoint/admin-update-original",
          p256dh_key: "test-p256dh-key-11",
          auth_key: "test-auth-key-11",
        })
        .select()
        .single();

      testSubscriptionId = subscription!.id;

      // Update it as admin
      const { data, error } = await supabase
        .from("push_subscriptions")
        .update({ endpoint: "https://test.endpoint/admin-updated" })
        .eq("id", subscription!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.endpoint).toBe("https://test.endpoint/admin-updated");

      await signOut();
    });
  });

  describe("DELETE Policies", () => {
    it("should allow users to delete their own subscriptions", async () => {
      await signInAs("member");
      const member = await getCurrentMember();

      // Create a subscription
      const { data: subscription } = await supabase
        .from("push_subscriptions")
        .insert({
          member_id: member!.id,
          endpoint: "https://test.endpoint/to-delete",
          p256dh_key: "test-p256dh-key-12",
          auth_key: "test-auth-key-12",
        })
        .select()
        .single();

      // Delete it
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("id", subscription!.id);

      expect(error).toBeNull();

      // Verify it's deleted
      const { data: check } = await supabaseAdmin
        .from("push_subscriptions")
        .select()
        .eq("id", subscription!.id);

      expect(check).toEqual([]);

      await signOut();
    });

    it("should NOT allow users to delete other users' subscriptions", async () => {
      await signInAs("member");

      // Create a subscription for member2
      const { data: subscription } = await supabaseAdmin
        .from("push_subscriptions")
        .insert({
          member_id: testData.member2Id,
          endpoint: "https://test.endpoint/member2-delete",
          p256dh_key: "test-p256dh-key-13",
          auth_key: "test-auth-key-13",
        })
        .select()
        .single();

      testSubscriptionId = subscription!.id;

      // Try to delete it as member
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("id", subscription!.id);

      expect(error).toBeDefined();
      expect(error?.message).toContain("violates row-level security");

      await signOut();
    });

    it("should allow admins to delete any subscription", async () => {
      await signInAs("admin");

      // Create a subscription
      const { data: subscription } = await supabaseAdmin
        .from("push_subscriptions")
        .insert({
          member_id: testData.memberId,
          endpoint: "https://test.endpoint/admin-delete",
          p256dh_key: "test-p256dh-key-14",
          auth_key: "test-auth-key-14",
        })
        .select()
        .single();

      // Delete it as admin
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("id", subscription!.id);

      expect(error).toBeNull();

      // Verify deletion
      const { data: check } = await supabaseAdmin
        .from("push_subscriptions")
        .select()
        .eq("id", subscription!.id);

      expect(check).toEqual([]);

      await signOut();
    });
  });

  describe("Real-World Scenarios", () => {
    it("should support multiple subscriptions per user (different devices)", async () => {
      await signInAs("member");
      const member = await getCurrentMember();

      // Create multiple subscriptions
      const { data: sub1 } = await supabase
        .from("push_subscriptions")
        .insert({
          member_id: member!.id,
          endpoint: "https://test.endpoint/device1",
          p256dh_key: "test-p256dh-key-15",
          auth_key: "test-auth-key-15",
          user_agent: "Chrome on Desktop",
        })
        .select()
        .single();

      const { data: sub2 } = await supabase
        .from("push_subscriptions")
        .insert({
          member_id: member!.id,
          endpoint: "https://test.endpoint/device2",
          p256dh_key: "test-p256dh-key-16",
          auth_key: "test-auth-key-16",
          user_agent: "Safari on iPhone",
        })
        .select()
        .single();

      // User should see both subscriptions
      const { data } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("member_id", member!.id);

      expect(data!.length).toBeGreaterThanOrEqual(2);

      // Cleanup
      await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub1!.id);
      await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub2!.id);

      await signOut();
    });

    it("should allow users to unsubscribe (delete) specific devices", async () => {
      await signInAs("member");
      const member = await getCurrentMember();

      // Create subscriptions for 2 devices
      const { data: desktop } = await supabase
        .from("push_subscriptions")
        .insert({
          member_id: member!.id,
          endpoint: "https://test.endpoint/desktop",
          p256dh_key: "test-p256dh-key-17",
          auth_key: "test-auth-key-17",
          user_agent: "Chrome Desktop",
        })
        .select()
        .single();

      const { data: mobile } = await supabase
        .from("push_subscriptions")
        .insert({
          member_id: member!.id,
          endpoint: "https://test.endpoint/mobile",
          p256dh_key: "test-p256dh-key-18",
          auth_key: "test-auth-key-18",
          user_agent: "Safari Mobile",
        })
        .select()
        .single();

      // Delete only desktop subscription
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("id", desktop!.id);

      // Mobile subscription should still exist
      const { data: remaining } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("member_id", member!.id);

      expect(remaining!.length).toBe(1);
      expect(remaining![0].id).toBe(mobile!.id);

      // Cleanup
      await supabaseAdmin.from("push_subscriptions").delete().eq("id", mobile!.id);

      await signOut();
    });
  });
});