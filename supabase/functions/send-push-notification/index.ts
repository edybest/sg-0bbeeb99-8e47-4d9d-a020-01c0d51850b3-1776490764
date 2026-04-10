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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT and check if admin
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    // Check if user is admin
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("is_admin")
      .eq("user_id", user.id)
      .single();

    if (memberError || !member?.is_admin) {
      throw new Error("Unauthorized - Admin access required");
    }

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
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID keys not configured");
    }

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
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});