---
title: Fix WhatsApp TAC service configuration error
status: in_progress
priority: high
type: bug
tags:
  - auth
  - whatsapp
  - api
created_by: agent
created_at: 2026-04-18
position: 7
---

## Notes
Pengguna melaporkan ralat runtime `WhatsApp service not configured` semasa menekan hantar TAC pada borang log masuk WhatsApp. Siasatan kemudian menunjukkan ralat seterusnya berubah kepada `supabaseKey is required.`, yang membuktikan API server juga kehilangan `SUPABASE_SERVICE_ROLE_KEY` semasa membina Supabase admin client. Titik yang terlibat ialah `src/pages/api/send-whatsapp-tac.ts`, `src/pages/api/verify-tac-login.ts`, dan `src/pages/api/generate-login-token.ts`. Pembetulan semasa menambah guard runtime supaya API memulangkan mesej konfigurasi yang jelas dan bukannya ralat mentah daripada SDK. Jika projek disambungkan terus melalui integrasi Supabase Softgen, kemungkinan langkah akhir ialah reconnect integrasi Supabase supaya service-role key disuntik semula ke runtime.

## Checklist
- [x] Semak titik ralat dalam borang log masuk WhatsApp dan API route hantar TAC.
- [x] Sahkan environment variable atau tetapan servis yang diperlukan untuk penghantaran TAC.
- [x] Betulkan pengendalian ralat supaya ketiadaan konfigurasi server dipaparkan dengan mesej yang tepat.
- [ ] Sahkan `SUPABASE_SERVICE_ROLE_KEY` benar-benar tersedia dalam runtime projek.
- [ ] Betulkan aliran supaya servis WhatsApp menggunakan konfigurasi yang betul atau fallback yang selamat.
- [ ] Jalankan semakan ralat selepas pembetulan.