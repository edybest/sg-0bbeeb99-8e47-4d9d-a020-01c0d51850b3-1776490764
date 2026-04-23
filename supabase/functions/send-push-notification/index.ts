import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ambc-client",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Audience = {
  type?: string;
  memberIds?: string[];
  date?: string;
};

type PushSubscriptionRow = {
  id: string;
  member_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function getAuthenticatedAdminUser(
  supabase: ReturnType<typeof createClient>,
  authHeader: string,
) {
  const jwt = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(jwt);

  if (authError || !user) {
    throw new Error(`Authentication failed: ${authError?.message ?? "Invalid authentication"}`);
  }

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError) {
    throw new Error(`Failed to verify admin status: ${memberError.message}`);
  }

  if (!member?.is_admin) {
    throw new Error("Unauthorized - Admin access required");
  }

  return user;
}

async function listSubscriptions(
  supabase: ReturnType<typeof createClient>,
  audience: Audience,
): Promise<PushSubscriptionRow[]> {
  let query = supabase
    .from("push_subscriptions")
    .select("id, member_id, endpoint, p256dh_key, auth_key");

  if (
    (audience.type === "selected_members" || audience.type === "selected") &&
    Array.isArray(audience.memberIds) &&
    audience.memberIds.length > 0
  ) {
    query = query.in("member_id", audience.memberIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch subscriptions: ${error.message}`);
  }

  return (data as PushSubscriptionRow[] | null) ?? [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const { title, message, audience = {} } = await req.json();

    if (!title || !message) {
      throw new Error("Title and message are required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Server configuration error");
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID keys not configured");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    await getAuthenticatedAdminUser(supabase, authHeader);

    webpush.setVapidDetails("mailto:support@ambc.club", vapidPublicKey, vapidPrivateKey);

    const subscriptions = await listSubscriptions(supabase, audience as Audience);

    if (subscriptions.length === 0) {
      return jsonResponse({
        success: true,
        sent: 0,
        failed: 0,
        total: 0,
        message: "No push subscriptions found",
      });
    }

    const payload = JSON.stringify({
      title,
      body: message,
      message,
      icon: "/ambc-logo.png",
      badge: "/ambc-logo.png",
      data: {
        url: "/member",
      },
    });

    let sent = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh_key,
              auth: subscription.auth_key,
            },
          },
          payload,
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : undefined;

        console.error("Push delivery failed", {
          memberId: subscription.member_id,
          endpoint: subscription.endpoint,
          statusCode,
          error: getErrorMessage(error),
        });

        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
        }
      }
    }

    return jsonResponse({
      success: true,
      sent,
      failed,
      total: subscriptions.length,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message.includes("Authentication failed") || message.includes("Unauthorized") ? 401 : 500;

    return jsonResponse(
      {
        success: false,
        error: message,
        sent: 0,
        failed: 0,
      },
      status,
    );
  }
});