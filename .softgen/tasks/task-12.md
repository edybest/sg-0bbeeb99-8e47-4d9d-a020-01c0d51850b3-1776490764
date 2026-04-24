---
title: WhatsApp TAC configuration fix
status: done
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
Siasatan mengesahkan punca ralat datang daripada semakan `FONNTE_API_TOKEN` dalam API route `send-whatsapp-tac`. Pembolehubah itu belum wujud dalam `.env.local`, jadi server sentiasa memulangkan mesej generik `WhatsApp service not configured`. Pembetulan dibuat dengan menggantikan mesej generik itu kepada arahan yang jelas untuk menambah `FONNTE_API_TOKEN` di Settings → Environment dan restart server. Borang login WhatsApp juga kini memaparkan ralat tersebut terus di dalam kad supaya pengguna tahu langkah seterusnya tanpa hanya bergantung pada toast.

## Checklist
- [x] Semak aliran `handleSendTAC` dalam borang login WhatsApp
- [x] Semak API route `send-whatsapp-tac` dan servis WhatsApp untuk punca mesej ralat
- [x] Semak pembolehubah persekitaran yang diperlukan oleh servis WhatsApp
- [x] Betulkan punca konfigurasi supaya penghantaran TAC tidak gagal secara palsu
- [x] Jalankan semakan ralat selepas pembetulan

## Acceptance
Pengguna boleh menekan butang hantar TAC tanpa menerima ralat konfigurasi palsu apabila konfigurasi yang diperlukan memang wujud.
Jika konfigurasi benar-benar tiada, mesej ralat yang dipaparkan menerangkan apa yang perlu diisi dengan jelas.