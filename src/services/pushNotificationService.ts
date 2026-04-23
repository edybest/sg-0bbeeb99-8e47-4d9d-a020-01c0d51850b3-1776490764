import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY } from "@/config/vapid";

/**
 * Push Notification Service
 * Handles Web Push notification subscriptions and management
 */

interface PushSubscriptionData {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent: string;
}

/**
 * Convert base64 string to Uint8Array for VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    throw new Error("Browser tidak support push notifications");
  }

  const permission = await Notification.requestPermission();
  console.log("📬 Notification permission:", permission);
  return permission;
}

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | null {
  if (!("Notification" in window)) return null;
  return Notification.permission;
}

/**
 * Subscribe user to push notifications
 */
export async function subscribeToPushNotifications(memberId: string): Promise<boolean> {
  try {
    // Check support
    if (!isPushNotificationSupported()) {
      throw new Error("Push notifications tidak disokong oleh browser ini");
    }

    // Check VAPID key
    if (!VAPID_PUBLIC_KEY) {
      console.error("VAPID public key tidak ditemui");
      throw new Error("Push notification configuration error");
    }

    // Request permission
    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission ditolak");
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    console.log("📱 Service Worker ready, subscribing to push...");

    const existingSubscription = await registration.pushManager.getSubscription();
    const subscription =
      existingSubscription ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));

    console.log(
      existingSubscription ? "♻️ Reusing existing push subscription:" : "✅ Push subscription created:",
      subscription.endpoint
    );

    // Extract subscription data
    const subscriptionJson = subscription.toJSON();
    const keys = subscriptionJson.keys;

    if (!keys?.p256dh || !keys?.auth) {
      throw new Error("Invalid subscription keys");
    }

    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      p256dh_key: keys.p256dh,
      auth_key: keys.auth,
      user_agent: navigator.userAgent,
    };

    // Save to database
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          member_id: memberId,
          ...subscriptionData,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "member_id,endpoint",
        }
      );

    if (error) {
      console.error("Failed to save subscription:", error);
      throw error;
    }

    console.log("✅ Push subscription saved to database");
    return true;
  } catch (error) {
    console.error("Push subscription error:", error);
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(memberId: string): Promise<boolean> {
  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Unsubscribe from push manager
      await subscription.unsubscribe();
      console.log("✅ Unsubscribed from push notifications");
    }

    // Remove from database
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("member_id", memberId);

    if (error) {
      console.error("Failed to delete subscription:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Unsubscribe error:", error);
    throw error;
  }
}

/**
 * Check if user is already subscribed
 */
export async function isUserSubscribed(memberId: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const browserSubscription = await registration.pushManager.getSubscription();

    if (!browserSubscription) {
      return false;
    }

    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("member_id", memberId)
      .eq("endpoint", browserSubscription.endpoint)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error("Check subscription error:", error);
    return false;
  }
}

/**
 * Send test notification to verify setup
 */
export async function sendTestNotification(): Promise<void> {
  if (!("Notification" in window)) {
    throw new Error("Notifications not supported");
  }

  if (Notification.permission !== "granted") {
    throw new Error("Notification permission not granted");
  }

  const registration = await navigator.serviceWorker.ready;
  // Use 'any' cast because TS DOM lib might not include 'vibrate' in NotificationOptions
  const options: any = {
    body: "Push notifications berfungsi dengan baik! ✅",
    icon: "/ambc-logo.png",
    badge: "/ambc-logo.png",
    vibrate: [200, 100, 200],
    tag: "test-notification",
  };

  await registration.showNotification("AMBC Club", options);
}

export const pushNotificationService = {
  requestPermission: requestNotificationPermission,
  isSupported: isPushNotificationSupported,
  getPermission: getNotificationPermission,
  subscribe: subscribeToPushNotifications,
  unsubscribe: unsubscribeFromPushNotifications,
  isSubscribed: isUserSubscribed,
  sendTest: sendTestNotification,
};