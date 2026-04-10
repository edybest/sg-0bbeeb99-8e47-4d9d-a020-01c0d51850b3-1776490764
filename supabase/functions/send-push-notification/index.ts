import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  title: string;
  message: string;
  audience: {
    type: "all_members" | "selected_members" | "blok_players_by_date";
    memberIds?: string[];
    date?: string;
  };
}

interface PushSubscription {
  id: string;
  member_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

serve(async (req) => {
  console.log("🚀 Edge Function triggered:", new Date().toISOString());
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("✅ CORS preflight request");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("📝 Request method:", req.method);
    
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    console.log("🔐 Auth header present:", !!authHeader);
    
    if (!authHeader) {
      console.error("❌ Missing authorization header");
      throw new Error("Missing authorization header");
    }

    // Check environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log("🔧 Environment check:", {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseKey,
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Missing Supabase environment variables");
      throw new Error("Server configuration error");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT and check if admin
    const jwt = authHeader.replace("Bearer ", "");
    console.log("🔍 Verifying user JWT...");
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError) {
      console.error("❌ Auth error:", authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    if (!user) {
      console.error("❌ No user found");
      throw new Error("Invalid authentication");
    }

    console.log("✅ User authenticated:", user.id);

    // Check if user is admin
    console.log("👤 Checking admin status...");
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("is_admin")
      .eq("user_id", user.id)
      .single();

    if (memberError) {
      console.error("❌ Member query error:", memberError);
      throw new Error(`Failed to verify admin status: ${memberError.message}`);
    }
    
    if (!member?.is_admin) {
      console.error("❌ User is not admin");
      throw new Error("Unauthorized - Admin access required");
    }

    console.log("✅ Admin verified");

    // Parse request body
    const payload: NotificationPayload = await req.json();
    const { title, message, audience } = payload;

    if (!title || !message) {
      throw new Error("Title and message are required");
    }

    console.log("📬 Sending push notification:", { title, audience: audience.type });

    // Get target member IDs based on audience
    let targetMemberIds: string[] = [];

    if (audience.type === "all_members") {
      const { data: members } = await supabase
        .from("members")
        .select("id")
        .eq("status", "active");
      
      targetMemberIds = members?.map((m) => m.id) || [];
    } else if (audience.type === "selected_members" && audience.memberIds) {
      targetMemberIds = audience.memberIds;
    } else if (audience.type === "blok_players_by_date" && audience.date) {
      const { data: players } = await supabase
        .from("game_players")
        .select("member:members!inner(id)")
        .eq("game:games!inner.game_date", audience.date);
      
      targetMemberIds = players?.map((p: any) => p.member.id) || [];
    }

    if (targetMemberIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No recipients found", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push subscriptions for target members
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("member_id", targetMemberIds);

    if (subError) {
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No push subscriptions found", 
          sent: 0,
          targetMembers: targetMemberIds.length 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get VAPID keys from environment
    console.log("🔑 Checking VAPID keys...");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    console.log("🔑 VAPID keys status:", {
      hasPublicKey: !!vapidPublicKey,
      hasPrivateKey: !!vapidPrivateKey,
      publicKeyLength: vapidPublicKey?.length || 0,
      privateKeyLength: vapidPrivateKey?.length || 0,
    });

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("❌ VAPID keys missing!");
      throw new Error("VAPID keys not configured. Please add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to Supabase secrets.");
    }

    if (vapidPublicKey.length < 80 || vapidPrivateKey.length < 40) {
      console.error("❌ VAPID keys seem invalid (too short)");
      throw new Error("VAPID keys appear to be invalid. Please regenerate and update in Supabase secrets.");
    }

    console.log("✅ VAPID keys validated");

    // Send push notifications
    let successCount = 0;
    let failCount = 0;

    for (const sub of subscriptions as PushSubscription[]) {
      try {
        const pushPayload = JSON.stringify({
          title,
          body: message,
          icon: "/ambc-logo.png",
          badge: "/ambc-logo.png",
          data: {
            url: "/member",
            timestamp: Date.now(),
          },
        });

        // Use web-push library via npm:web-push
        const webpush = await import("npm:web-push@3.6.6");
        
        webpush.setVapidDetails(
          "mailto:admin@ambc.club",
          vapidPublicKey,
          vapidPrivateKey
        );

        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key,
            },
          },
          pushPayload
        );

        successCount++;
        console.log(`✅ Push sent to member ${sub.member_id}`);
      } catch (error) {
        failCount++;
        console.error(`❌ Failed to send push to ${sub.member_id}:`, error);
        
        // If subscription is invalid, delete it
        if (error.statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
          console.log(`🗑️ Deleted invalid subscription for member ${sub.member_id}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Push notifications sent`,
        sent: successCount,
        failed: failCount,
        total: subscriptions.length,
        targetMembers: targetMemberIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("💥 Edge Function Error:", error);
    console.error("💥 Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const statusCode = errorMessage.includes("authentication") || errorMessage.includes("Unauthorized") ? 401 : 400;
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});