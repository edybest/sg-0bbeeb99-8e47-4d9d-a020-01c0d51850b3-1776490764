/**
 * VAPID Configuration for Web Push Notifications
 * 
 * SETUP INSTRUCTIONS:
 * 1. Generate VAPID keys: https://www.attheminute.com/vapid-key-generator
 * 2. Add VAPID_PRIVATE_KEY to Supabase Edge Function Secrets
 * 3. Replace the PUBLIC_KEY below with your generated public key
 */

export const VAPID_PUBLIC_KEY = "REPLACE_WITH_YOUR_VAPID_PUBLIC_KEY";

/**
 * IMPORTANT: Never commit your private key to code!
 * Private key should ONLY be in Supabase Edge Function Secrets.
 */