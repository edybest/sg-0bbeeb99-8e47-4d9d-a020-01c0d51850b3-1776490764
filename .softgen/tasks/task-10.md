---
title: Push notification background delivery
status: done
priority: high
type: bug
tags:
- pwa
- notification
- admin
- member
created_by: agent
created_at: 2026-04-23 13:05:32 UTC
position: 10
---

## Notes
Pengguna melaporkan ahli yang sudah install PWA tidak menerima notification apabila admin hantar mesej selagi app tidak dibuka dahulu. Siasatan terdahulu tertumpu pada background push. Maklum balas terbaru menunjukkan panel admin kini memaparkan mesej ralat sebenar `Unsupported JWT algorithm ES256`. Punca dikenal pasti pada lapisan verifikasi JWT platform Edge Function yang menolak token sesi admin beralgoritma `ES256` sebelum kod fungsi sempat berjalan. Pembetulan dibuat dengan redeploy `send-push-notification` tanpa platform JWT verification dan mengekalkan semakan admin secara manual di dalam fungsi menggunakan token `Authorization` yang dihantar oleh klien. Ini membolehkan fungsi terus menerima sesi admin yang sah dan meneruskan proses penghantaran push.

## Checklist
- [x] Semak aliran penghantaran mesej admin dalam panel push message
- [x] Semak servis push notification dan fungsi background delivery
- [x] Semak `public/sw.js` untuk event push dan notification click
- [x] Semak komponen PWA/install/permission untuk subscription push ahli
- [x] Semak flow simpan notification in-app untuk target user tertentu
- [x] Semak query inbox member dan filter penerima notification
- [x] Semak rekod `push_subscriptions` untuk user `edy`
- [x] Sahkan status subscription dan endpoint device semasa
- [x] Tentukan sama ada subscription semasa sepadan dengan aliran push yang dihantar
- [x] Tambah butiran hasil delivery push dalam respons Edge Function
- [x] Paparkan status penghantaran push sebenar dalam panel admin
- [x] Semak punca status non-2xx daripada Edge Function
- [x] Baiki paparan mesej ralat sebenar pada panel admin
- [x] Semak punca verifikasi JWT `ES256` dalam Edge Function
- [x] Betulkan aliran auth untuk panggilan `send-push-notification`
- [x] Jalankan semakan ralat selepas pembetulan