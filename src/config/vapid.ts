/**
 * VAPID Configuration for Web Push Notifications
 * 
 * SETUP INSTRUCTIONS:
 * 1. Generate VAPID keys: https://www.attheminute.com/vapid-key-generator
 * 2. Add VAPID_PRIVATE_KEY to Supabase Edge Function Secrets
 * 3. Replace the PUBLIC_KEY below with your generated public key
 */

export const VAPID_PUBLIC_KEY = "BHgPq_heldkFm81B0FbFJXx_7H21KphOFP0EID6l9WzmulqeQL09jynTk5O4lv5b6LnbchSEEN3rNqpxwun4MLw";

/**
 * IMPORTANT: Never commit your private key to code!
 * Private key should ONLY be in Supabase Edge Function Secrets.
 */