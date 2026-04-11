import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Test environment setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables for testing");
}

// Regular client for authenticated operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Service role client for test setup/teardown (bypasses RLS)
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey
);

// Test user credentials
export const TEST_USERS = {
  admin: {
    email: "test-admin@ambc.test",
    password: "TestAdmin123!",
    phone: "+60123456789",
  },
  member: {
    email: "test-member@ambc.test",
    password: "TestMember123!",
    phone: "+60123456790",
  },
  member2: {
    email: "test-member2@ambc.test",
    password: "TestMember2123!",
    phone: "+60123456791",
  },
};

// Test data IDs (populated during setup)
export const testData = {
  adminId: "",
  memberId: "",
  member2Id: "",
  chatRoomId: "",
  miniBlokId: "",
};

// Global setup - runs once before all tests
export async function globalSetup() {
  console.log("🧪 Setting up test environment...");

  // Create test users if they don't exist
  for (const [role, credentials] of Object.entries(TEST_USERS)) {
    try {
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(
        credentials.email
      );

      if (!existingUser?.user) {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: credentials.email,
          password: credentials.password,
          phone: credentials.phone,
          email_confirm: true,
          phone_confirm: true,
        });

        if (error) {
          console.error(`Failed to create ${role}:`, error);
        } else {
          console.log(`✅ Created test user: ${role}`);

          // Create member profile
          const { error: memberError } = await supabaseAdmin
            .from("members")
            .insert({
              user_id: data.user.id,
              phone_number: credentials.phone,
              name: `Test ${role}`,
              is_admin: role === "admin",
            });

          if (memberError) {
            console.error(`Failed to create member profile for ${role}:`, memberError);
          }
        }
      } else {
        console.log(`✅ Test user exists: ${role}`);
      }
    } catch (error) {
      console.error(`Error setting up ${role}:`, error);
    }
  }

  console.log("✅ Test environment ready\n");
}

// Global teardown - runs once after all tests
export async function globalTeardown() {
  console.log("\n🧹 Cleaning up test environment...");

  // Optional: Clean up test data
  // In development, you might want to keep test users for debugging
  // In CI/CD, uncomment the cleanup code below

  /*
  for (const credentials of Object.values(TEST_USERS)) {
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserByEmail(
        credentials.email
      );
      if (data?.user) {
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }
  */

  console.log("✅ Cleanup complete");
}

// Helper: Sign in as a test user
export async function signInAs(userType: keyof typeof TEST_USERS) {
  const credentials = TEST_USERS[userType];
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    throw new Error(`Failed to sign in as ${userType}: ${error.message}`);
  }

  return data;
}

// Helper: Sign out current user
export async function signOut() {
  await supabase.auth.signOut();
}

// Helper: Get current user's member record
export async function getCurrentMember() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("members")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data;
}

// Helper: Create test data
export async function createTestData() {
  const adminSession = await signInAs("admin");
  const admin = await getCurrentMember();
  testData.adminId = admin!.id;

  await signInAs("member");
  const member = await getCurrentMember();
  testData.memberId = member!.id;

  await signInAs("member2");
  const member2 = await getCurrentMember();
  testData.member2Id = member2!.id;

  // Create a test chat room
  await signInAs("admin");
  const { data: chatRoom } = await supabase
    .from("chat_rooms")
    .insert({
      name: "Test Room",
      description: "Test chat room",
    })
    .select()
    .single();

  if (chatRoom) {
    testData.chatRoomId = chatRoom.id;
  }

  // Create a test mini_blok
  await signInAs("member");
  const { data: miniBlok } = await supabase
    .from("mini_blok")
    .insert({
      name: "Test Mini Blok",
      owner_id: testData.memberId,
    })
    .select()
    .single();

  if (miniBlok) {
    testData.miniBlokId = miniBlok.id;
  }

  await signOut();
}

// Helper: Clean up test data
export async function cleanupTestData() {
  await signInAs("admin");

  // Delete in order respecting foreign keys
  if (testData.miniBlokId) {
    await supabaseAdmin.from("mini_blok_collaborators").delete().eq("mini_blok_id", testData.miniBlokId);
    await supabaseAdmin.from("mini_blok_shares").delete().eq("mini_blok_id", testData.miniBlokId);
    await supabaseAdmin.from("mini_blok").delete().eq("id", testData.miniBlokId);
  }

  if (testData.chatRoomId) {
    await supabaseAdmin.from("chat_messages").delete().eq("room_id", testData.chatRoomId);
    await supabaseAdmin.from("chat_participants").delete().eq("room_id", testData.chatRoomId);
    await supabaseAdmin.from("chat_rooms").delete().eq("id", testData.chatRoomId);
  }

  await signOut();
}