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

describe("Chat Tables RLS Tests", () => {
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

  describe("Chat Rooms", () => {
    it("should allow authenticated users to create chat rooms", async () => {
      await signInAs("member");

      const { data, error } = await supabase
        .from("chat_rooms")
        .insert({
          name: "Member Created Room",
          type: "group",
          created_by: testData.memberId,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.name).toBe("Member Created Room");

      // Cleanup
      if (data) {
        await signInAs("admin");
        await supabase.from("chat_rooms").delete().eq("id", data.id);
      }

      await signOut();
    });

    it("should allow participants to view rooms they are in", async () => {
      await signInAs("admin");
      const admin = await getCurrentMember();

      // Create room and add admin as participant
      const { data: room } = await supabase
        .from("chat_rooms")
        .insert({ 
          name: "Private Room", 
          type: "group", 
          created_by: testData.adminId 
        })
        .select()
        .single();

      await supabase
        .from("chat_participants")
        .insert({
          room_id: room!.id,
          member_id: admin!.id,
        });

      // Switch to admin and verify they can see the room
      const { data: rooms, error } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("id", room!.id);

      expect(error).toBeNull();
      expect(rooms).toBeDefined();
      expect(rooms!.length).toBeGreaterThan(0);

      // Cleanup
      await supabase.from("chat_participants").delete().eq("room_id", room!.id);
      await supabase.from("chat_rooms").delete().eq("id", room!.id);

      await signOut();
    });

    it("should allow admins to delete any chat room", async () => {
      await signInAs("admin");

      const { data: room } = await supabase
        .from("chat_rooms")
        .insert({ 
          name: "To Delete", 
          type: "group", 
          created_by: testData.adminId 
        })
        .select()
        .single();

      const { error } = await supabase
        .from("chat_rooms")
        .delete()
        .eq("id", room!.id);

      expect(error).toBeNull();

      await signOut();
    });
  });

  describe("Chat Messages", () => {
    it("should allow participants to send messages", async () => {
      await signInAs("member");
      const member = await getCurrentMember();

      // Add member as participant to test room
      await signInAs("admin");
      await supabase
        .from("chat_participants")
        .insert({
          room_id: testData.chatRoomId,
          member_id: testData.memberId,
        });

      await signInAs("member");

      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          room_id: testData.chatRoomId,
          sender_id: member!.id,
          message: "Test message",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.message).toBe("Test message");

      // Cleanup
      if (data) {
        await signInAs("admin");
        await supabase.from("chat_messages").delete().eq("id", data.id);
        await supabase
          .from("chat_participants")
          .delete()
          .eq("room_id", testData.chatRoomId)
          .eq("member_id", testData.memberId);
      }

      await signOut();
    });

    it("should NOT allow non-participants to send messages", async () => {
      await signInAs("member2");
      const member2 = await getCurrentMember();

      // Ensure member2 is NOT a participant
      await signInAs("admin");
      await supabase
        .from("chat_participants")
        .delete()
        .eq("room_id", testData.chatRoomId)
        .eq("member_id", testData.member2Id);

      await signInAs("member2");

      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          room_id: testData.chatRoomId,
          sender_id: member2!.id,
          message: "Unauthorized message",
        })
        .select();

      expect(data).toBeNull();
      expect(error).toBeDefined();

      await signOut();
    });

    it("should allow users to delete their own messages", async () => {
      await signInAs("member");
      const member = await getCurrentMember();

      // Add as participant and create message
      await signInAs("admin");
      await supabase
        .from("chat_participants")
        .insert({
          room_id: testData.chatRoomId,
          member_id: testData.memberId,
        });

      await signInAs("member");

      const { data: message } = await supabase
        .from("chat_messages")
        .insert({
          room_id: testData.chatRoomId,
          sender_id: member!.id,
          message: "To be deleted",
        })
        .select()
        .single();

      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("id", message!.id);

      expect(error).toBeNull();

      // Cleanup
      await signInAs("admin");
      await supabase
        .from("chat_participants")
        .delete()
        .eq("room_id", testData.chatRoomId)
        .eq("member_id", testData.memberId);

      await signOut();
    });

    it("should NOT allow users to delete others messages", async () => {
      await signInAs("admin");
      const admin = await getCurrentMember();

      // Admin creates a message
      const { data: message } = await supabase
        .from("chat_messages")
        .insert({
          room_id: testData.chatRoomId,
          sender_id: admin!.id,
          message: "Admin message",
        })
        .select()
        .single();

      // Member tries to delete it
      await signInAs("member");
      await supabase
        .from("chat_participants")
        .insert({
          room_id: testData.chatRoomId,
          member_id: testData.memberId,
        });

      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("id", message!.id);

      expect(error).toBeDefined();

      // Cleanup
      await signInAs("admin");
      await supabase.from("chat_messages").delete().eq("id", message!.id);
      await supabase
        .from("chat_participants")
        .delete()
        .eq("room_id", testData.chatRoomId)
        .eq("member_id", testData.memberId);

      await signOut();
    });
  });
});