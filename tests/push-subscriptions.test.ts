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

describe("Notification Recipients RLS & Pagination", () => {
  let testNotificationIds: string[] = [];

  beforeEach(async () => {
    // Clean up previous test notifications
    await signInAs("admin");
    for (const id of testNotificationIds) {
      await supabaseAdmin.from("notifications").delete().eq("id", id);
    }
    testNotificationIds = [];
    await signOut();
  });

  describe("DELETE Policies", () => {
    it("should allow users to delete their own notifications", async () => {
      await signInAs("admin");
      
      // Create notification for member
      const { data: notification } = await supabase
        .from("notifications")
        .insert({
          title: "Test Notification",
          message: "This can be deleted",
          target_type: "members",
        })
        .select()
        .single();

      testNotificationIds.push(notification!.id);

      await supabase.from("notification_recipients").insert({
        notification_id: notification!.id,
        member_id: testData.memberId,
        delivered_at: new Date().toISOString(),
        read_at: new Date().toISOString(), // Mark as read
      });

      await signOut();

      // Member deletes their own notification
      await signInAs("member");
      const { error } = await supabase
        .from("notification_recipients")
        .delete()
        .eq("notification_id", notification!.id)
        .eq("member_id", testData.memberId);

      expect(error).toBeNull();

      // Verify deletion
      const { data: check } = await supabase
        .from("notification_recipients")
        .select()
        .eq("notification_id", notification!.id)
        .eq("member_id", testData.memberId)
        .single();

      expect(check).toBeNull();

      await signOut();
    });

    it("should NOT allow users to delete other users' notifications", async () => {
      await signInAs("admin");
      
      // Create notification for member2
      const { data: notification } = await supabase
        .from("notifications")
        .insert({
          title: "Test Notification",
          message: "Someone else's notification",
          target_type: "members",
        })
        .select()
        .single();

      testNotificationIds.push(notification!.id);

      await supabase.from("notification_recipients").insert({
        notification_id: notification!.id,
        member_id: testData.member2Id,
        delivered_at: new Date().toISOString(),
        read_at: new Date().toISOString(),
      });

      await signOut();

      // Member tries to delete member2's notification
      await signInAs("member");
      const { data, error } = await supabase
        .from("notification_recipients")
        .delete()
        .eq("notification_id", notification!.id)
        .eq("member_id", testData.member2Id)
        .select();

      // Should return empty array (RLS blocks)
      expect(data).toEqual([]);

      await signOut();
    });

    it("should allow admins to delete any notification", async () => {
      await signInAs("admin");
      
      // Create notification for member
      const { data: notification } = await supabase
        .from("notifications")
        .insert({
          title: "Admin Delete Test",
          message: "Admin can delete this",
          target_type: "members",
        })
        .select()
        .single();

      testNotificationIds.push(notification!.id);

      await supabase.from("notification_recipients").insert({
        notification_id: notification!.id,
        member_id: testData.memberId,
        delivered_at: new Date().toISOString(),
        read_at: new Date().toISOString(),
      });

      // Admin deletes member's notification
      const { error } = await supabase
        .from("notification_recipients")
        .delete()
        .eq("notification_id", notification!.id)
        .eq("member_id", testData.memberId);

      expect(error).toBeNull();

      // Verify deletion
      const { data: check } = await supabase
        .from("notification_recipients")
        .select()
        .eq("notification_id", notification!.id)
        .eq("member_id", testData.memberId)
        .single();

      expect(check).toBeNull();

      await signOut();
    });
  });

  describe("Pagination", () => {
    beforeEach(async () => {
      // Create 25 test notifications for pagination testing
      await signInAs("admin");

      for (let i = 1; i <= 25; i++) {
        const { data: notification } = await supabase
          .from("notifications")
          .insert({
            title: `Test Notification ${i}`,
            message: `Message ${i}`,
            target_type: "members",
          })
          .select()
          .single();

        testNotificationIds.push(notification!.id);

        await supabase.from("notification_recipients").insert({
          notification_id: notification!.id,
          member_id: testData.memberId,
          delivered_at: new Date(Date.now() + i * 1000).toISOString(), // Stagger times
        });
      }

      await signOut();
    });

    it("should return first 10 notifications on page 1", async () => {
      await signInAs("member");

      const { data, error, count } = await supabase
        .from("notification_recipients")
        .select("*", { count: "exact" })
        .eq("member_id", testData.memberId)
        .order("delivered_at", { ascending: false })
        .range(0, 9); // First 10 items (0-9)

      expect(error).toBeNull();
      expect(data?.length).toBe(10);
      expect(count).toBeGreaterThanOrEqual(25);

      await signOut();
    });

    it("should return next 10 notifications on page 2", async () => {
      await signInAs("member");

      const { data, error } = await supabase
        .from("notification_recipients")
        .select("*")
        .eq("member_id", testData.memberId)
        .order("delivered_at", { ascending: false })
        .range(10, 19); // Second 10 items (10-19)

      expect(error).toBeNull();
      expect(data?.length).toBe(10);

      await signOut();
    });

    it("should return remaining 5 notifications on page 3", async () => {
      await signInAs("member");

      const { data, error } = await supabase
        .from("notification_recipients")
        .select("*")
        .eq("member_id", testData.memberId)
        .order("delivered_at", { ascending: false })
        .range(20, 29); // Third page (20-29)

      expect(error).toBeNull();
      expect(data?.length).toBe(5); // Only 5 remaining

      await signOut();
    });

    it("should calculate hasMore correctly", async () => {
      await signInAs("member");

      // Page 1: hasMore = true (25 total > 10)
      const { count: totalCount } = await supabase
        .from("notification_recipients")
        .select("*", { count: "exact", head: true })
        .eq("member_id", testData.memberId);

      const page1HasMore = (totalCount ?? 0) > 10;
      expect(page1HasMore).toBe(true);

      // Page 2: hasMore = true (25 total > 20)
      const page2HasMore = (totalCount ?? 0) > 20;
      expect(page2HasMore).toBe(true);

      // Page 3: hasMore = false (25 total <= 30)
      const page3HasMore = (totalCount ?? 0) > 30;
      expect(page3HasMore).toBe(false);

      await signOut();
    });
  });

  describe("Real-World Notification Workflow", () => {
    it("should support full notification lifecycle: create -> mark read -> delete", async () => {
      await signInAs("admin");
      
      // 1. Admin creates notification
      const { data: notification } = await supabase
        .from("notifications")
        .insert({
          title: "Important Update",
          message: "Please read this carefully",
          target_type: "members",
        })
        .select()
        .single();

      testNotificationIds.push(notification!.id);

      await supabase.from("notification_recipients").insert({
        notification_id: notification!.id,
        member_id: testData.memberId,
        delivered_at: new Date().toISOString(),
      });

      await signOut();

      // 2. Member reads notification
      await signInAs("member");
      
      const { data: unreadNotif } = await supabase
        .from("notification_recipients")
        .select()
        .eq("notification_id", notification!.id)
        .eq("member_id", testData.memberId)
        .single();

      expect(unreadNotif?.read_at).toBeNull();

      // Mark as read
      await supabase
        .from("notification_recipients")
        .update({ read_at: new Date().toISOString() })
        .eq("notification_id", notification!.id)
        .eq("member_id", testData.memberId);

      const { data: readNotif } = await supabase
        .from("notification_recipients")
        .select()
        .eq("notification_id", notification!.id)
        .eq("member_id", testData.memberId)
        .single();

      expect(readNotif?.read_at).not.toBeNull();

      // 3. Member deletes notification
      const { error: deleteError } = await supabase
        .from("notification_recipients")
        .delete()
        .eq("notification_id", notification!.id)
        .eq("member_id", testData.memberId);

      expect(deleteError).toBeNull();

      // Verify deletion
      const { data: deletedNotif } = await supabase
        .from("notification_recipients")
        .select()
        .eq("notification_id", notification!.id)
        .eq("member_id", testData.memberId)
        .single();

      expect(deletedNotif).toBeNull();

      await signOut();
    });

    it("should support selective deletion while keeping unread notifications", async () => {
      await signInAs("admin");
      
      // Create 3 notifications
      const notifications = await Promise.all([
        supabase.from("notifications").insert({ title: "Notif 1", message: "Read this", target_type: "members" }).select().single(),
        supabase.from("notifications").insert({ title: "Notif 2", message: "And this", target_type: "members" }).select().single(),
        supabase.from("notifications").insert({ title: "Notif 3", message: "Keep unread", target_type: "members" }).select().single(),
      ]);

      for (const { data: n } of notifications) {
        testNotificationIds.push(n!.id);
        await supabase.from("notification_recipients").insert({
          notification_id: n!.id,
          member_id: testData.memberId,
          delivered_at: new Date().toISOString(),
        });
      }

      await signOut();

      // Member marks first 2 as read and deletes them
      await signInAs("member");

      // Mark first 2 as read
      await supabase
        .from("notification_recipients")
        .update({ read_at: new Date().toISOString() })
        .eq("notification_id", notifications[0].data!.id)
        .eq("member_id", testData.memberId);

      await supabase
        .from("notification_recipients")
        .update({ read_at: new Date().toISOString() })
        .eq("notification_id", notifications[1].data!.id)
        .eq("member_id", testData.memberId);

      // Delete first 2
      await supabase
        .from("notification_recipients")
        .delete()
        .eq("notification_id", notifications[0].data!.id)
        .eq("member_id", testData.memberId);

      await supabase
        .from("notification_recipients")
        .delete()
        .eq("notification_id", notifications[1].data!.id)
        .eq("member_id", testData.memberId);

      // Verify: Only 3rd notification remains
      const { data: remaining } = await supabase
        .from("notification_recipients")
        .select()
        .eq("member_id", testData.memberId)
        .in("notification_id", testNotificationIds);

      expect(remaining?.length).toBe(1);
      expect(remaining?.[0].notification_id).toBe(notifications[2].data!.id);
      expect(remaining?.[0].read_at).toBeNull(); // Still unread

      await signOut();
    });
  });
});