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
Pengguna melaporkan ralat runtime `WhatsApp service not configured` semasa menekan hantar TAC pada borang log masuk WhatsApp. Perlu semak aliran penuh daripada `WhatsAppLoginForm`, API route penghantaran TAC, servis WhatsApp, dan nilai environment yang diperlukan supaya mesej ralat ini boleh dihapuskan atau digantikan dengan pengendalian yang betul berdasarkan konfigurasi sebenar projek.

## Checklist
- [ ] Semak titik ralat dalam borang log masuk WhatsApp dan API route hantar TAC.
- [ ] Sahkan environment variable atau tetapan servis yang diperlukan untuk penghantaran TAC.
- [ ] Betulkan aliran supaya servis WhatsApp menggunakan konfigurasi yang betul atau fallback yang selamat.
- [ ] Jalankan semakan ralat selepas pembetulan.