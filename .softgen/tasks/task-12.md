---
title: WhatsApp TAC configuration fix
status: in_progress
priority: high
type: bug
tags:
- auth
- whatsapp
- api
created_by: agent
created_at: 2026-04-24 06:02:21 UTC
position: 12
---

## Notes
Pengguna menerima ralat runtime `WhatsApp service not configured` semasa menekan hantar TAC dalam borang login WhatsApp. Siasatan perlu semak komponen borang, API route penghantaran TAC, servis WhatsApp, dan pembolehubah persekitaran berkaitan untuk kenal pasti sama ada isu datang daripada semakan konfigurasi, nama env yang salah, atau fallback yang tiada.

## Checklist
- [ ] Semak aliran `handleSendTAC` dalam borang login WhatsApp
- [ ] Semak API route `send-whatsapp-tac` dan servis WhatsApp untuk punca mesej ralat
- [ ] Semak pembolehubah persekitaran yang diperlukan oleh servis WhatsApp
- [ ] Betulkan punca konfigurasi supaya penghantaran TAC tidak gagal secara palsu
- [ ] Jalankan semakan ralat selepas pembetulan

## Acceptance
Pengguna boleh menekan butang hantar TAC tanpa menerima ralat konfigurasi palsu apabila konfigurasi yang diperlukan memang wujud.
Jika konfigurasi benar-benar tiada, mesej ralat yang dipaparkan menerangkan apa yang perlu diisi dengan jelas.