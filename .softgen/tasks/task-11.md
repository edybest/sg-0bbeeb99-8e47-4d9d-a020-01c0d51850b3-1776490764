---
title: WhatsApp TAC login failure
status: in_progress
priority: urgent
type: bug
tags:
- auth
- whatsapp
- api
created_by: agent
created_at: 2026-04-23 23:28:26 UTC
position: 11
---

## Notes
Pengguna melaporkan pada halaman login, butang hantar TAC kini memaparkan ralat `fetch failed`. Fokus siasatan ialah memastikan request dari borang login ke API route `/api/send-whatsapp-tac` masih berjaya, semak sama ada route crash, semak dependency servis WhatsApp, dan tentukan sama ada punca datang daripada kod, konfigurasi, atau sambungan keluar ke penyedia WhatsApp.

## Checklist
- [ ] Semak komponen login WhatsApp yang menghantar request TAC
- [ ] Semak API route `send-whatsapp-tac` dan servis WhatsApp yang digunakan
- [ ] Semak log server untuk ralat sebenar ketika request dibuat
- [ ] Kenal pasti punca `fetch failed` dengan bukti fail atau log
- [ ] Betulkan punca jika jelas dan sahkan semula dengan semakan ralat