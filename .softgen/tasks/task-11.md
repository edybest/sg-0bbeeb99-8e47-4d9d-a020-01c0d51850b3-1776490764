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
Pengguna melaporkan pada halaman login, butang hantar TAC kini memaparkan ralat `fetch failed`. Siasatan setakat ini menunjukkan borang login masih menghantar request ke `/api/send-whatsapp-tac`, dan API route itu seterusnya cuba memanggil `https://api.fonnte.com/send`. Bukti semasa: DNS `api.fonnte.com` berjaya resolve, akses internet umum dari server juga normal (`fetch_example=200`), tetapi fetch terus ke Fonnte gagal dengan `fetch failed`. Ini menjadikan punca semasa lebih cenderung kepada isu sambungan network/TLS ke Fonnte atau provider upstream, bukan format nombor telefon pengguna.

## Checklist
- [x] Semak komponen login WhatsApp yang menghantar request TAC
- [x] Semak API route `send-whatsapp-tac` dan servis WhatsApp yang digunakan
- [x] Semak log server untuk ralat sebenar ketika request dibuat
- [x] Kenal pasti punca `fetch failed` dengan bukti fail atau log
- [ ] Betulkan punca jika jelas dan sahkan semula dengan semakan ralat