import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ambc-client",
};

serve(async (req) => {
  console.log("🚀 Edge Function triggered:", new Date().toISOString());
  console.log("🌐 Request URL:", req.url);
  console.log("📋 Request headers:", Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("✅ CORS preflight request - returning OK");
    return new Response("ok", { headers: corsHeaders });
  }

  // Wrap entire function in try-catch for safety
  let requestBody;
  try {
    console.log("📝 Request method:", req.method);
    
    // Parse request body
    try {
      requestBody = await req.json();
      console.log("📦 Request body:", requestBody);
    } catch (parseError) {
      console.error("❌ Failed to parse request body:", parseError);
      throw new Error("Invalid request body format");
    }
    
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

    // Validate request body
    const { title, message, audience } = requestBody;
    
    if (!title || !message) {
      console.error("❌ Missing title or message");
      throw new Error("Title and message are required");
    }

    console.log("📬 Sending notification:", { title, message, audienceType: audience?.type });

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

    // Build audience query
    let subscriptionsQuery = supabase
      .from("push_subscriptions")
      .select("*, members!inner(id, username)");

    if (audience?.type === "selected" && audience.memberIds?.length > 0) {
      subscriptionsQuery = subscriptionsQuery.in("member_id", audience.memberIds);
    }

    const { data: subscriptions, error: subError } = await subscriptionsQuery;

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("⚠️ No push subscriptions found");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No push subscriptions found",
          sent: 0,
          failed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`📬 Sending push to ${subscriptions.length} subscriptions...`);

    // Send push notifications
    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        console.log(`📤 Sending to member: ${sub.member_id}`);

        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key,
          },
        };

        const payload = JSON.stringify({
          title,
          body: message,
          icon: "/ambc-logo.png",
          badge: "/ambc-logo.png",
        });

        const response = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `key=${vapidPrivateKey}`,
          },
          body: JSON.stringify({
            to: sub.endpoint,
            notification: {
              title,
              body: message,
              icon: "/ambc-logo.png",
            },
          }),
        });

        if (response.ok) {
          console.log(`✅ Push sent to member: ${sub.member_id}`);
          sent++;
        } else {
          console.error(`❌ Push failed for member ${sub.member_id}:`, await response.text());
          failed++;
        }
      } catch (pushError) {
        console.error(`❌ Error sending push to ${sub.member_id}:`, pushError);
        failed++;
      }
    }

    console.log(`📊 Push notification results: { sent: ${sent}, failed: ${failed} }`);

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
    console.error("💥 CRITICAL: Edge Function Error:", error);
    console.error("💥 Error type:", error?.constructor?.name);
    console.error("💥 Error message:", error instanceof Error ? error.message : String(error));
    console.error("💥 Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const statusCode = errorMessage.includes("authentication") || errorMessage.includes("Unauthorized") ? 401 : 
                       errorMessage.includes("VAPID") ? 500 :
                       errorMessage.includes("Invalid request") ? 400 : 500;
    
    // Always return a valid response, even on error
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        sent: 0,
        failed: 0,
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (criticalError) {
    // Final fallback if even error handling fails
    console.error("💀 CRITICAL FAILURE:", criticalError);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Critical server error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});