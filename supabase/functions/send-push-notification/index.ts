import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ambc-client",
};

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

    // Parse request body
    const { title, message, audience } = await req.json();

    console.log("📬 Request payload:", {
      title,
      messageLength: message?.length || 0,
      audienceType: audience?.type,
    });

    // Fetch push subscriptions based on audience
    let query = supabase.from("push_subscriptions").select("*");

    if (audience.type === "selected") {
      query = query.in("member_id", audience.member_ids);
    } else if (audience.type === "blok_by_date") {
      // Get members who participated in blok on specific date
      const { data: participants } = await supabase
        .from("couple_scores")
        .select("member_id")
        .eq("game_date", audience.date);

      if (participants && participants.length > 0) {
        const memberIds = [...new Set(participants.map((p) => p.member_id))];
        query = query.in("member_id", memberIds);
      } else {
        console.log("⚠️ No participants found for date:", audience.date);
        return new Response(
          JSON.stringify({
            success: true,
            sent: 0,
            failed: 0,
            message: "No participants found for the selected date",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    // For "all", no filter needed

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error("❌ Failed to fetch subscriptions:", fetchError);
      throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`);
    }

    console.log("📊 Subscriptions found:", subscriptions?.length || 0);

    if (!subscriptions || subscriptions.length === 0) {
      console.log("⚠️ No push subscriptions found");
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          failed: 0,
          message: "No push subscriptions found. Members need to enable notifications.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send push notification to each subscription
    let sent = 0;
    let failed = 0;

    console.log("📬 Sending push notifications...");

    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key,
          },
        };

        // Use web-push library (Deno-compatible)
        const response = await fetch(subscription.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "TTL": "86400",
          },
          body: JSON.stringify({
            title,
            body: message,
            icon: "/ambc-logo.png",
            badge: "/ambc-logo.png",
            data: {
              url: "/member",
            },
          }),
        });

        if (response.ok) {
          console.log("✅ Push sent to member:", subscription.member_id);
          sent++;
        } else {
          console.error("❌ Push failed for member:", subscription.member_id, response.status);
          
          // If subscription is invalid (410 Gone), delete it
          if (response.status === 410) {
            console.log("🗑️ Removing invalid subscription:", subscription.id);
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", subscription.id);
          }
          
          failed++;
        }
      } catch (error) {
        console.error("❌ Error sending push to member:", subscription.member_id, error);
        failed++;
      }
    }

    console.log("📊 Push notification results:", { sent, failed });

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
        total: subscriptions.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
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