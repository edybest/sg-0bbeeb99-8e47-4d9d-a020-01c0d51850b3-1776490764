---
title: Push notification background delivery
status: in_progress
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
Pengguna melaporkan ahli yang sudah install PWA tidak menerima notification apabila admin hantar mesej selagi app tidak dibuka dahulu. Siasatan terdahulu tertumpu pada background push. Maklum balas terbaru menunjukkan panel admin kini memaparkan mesej ralat sebenar `Unsupported JWT algorithm ES256`. Ini menunjukkan panggilan ke Edge Function `send-push-notification` gagal pada lapisan verifikasi token sesi admin sebelum proses penghantaran push bermula. Fokus semasa ialah menyemak kod verifikasi auth dalam Edge Function dan cara panel admin memanggil fungsi tersebut, kemudian membaiki aliran supaya token sesi yang sah tidak ditolak.

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
- [ ] Semak punca verifikasi JWT `ES256` dalam Edge Function
- [ ] Betulkan aliran auth untuk panggilan `send-push-notification`
- [ ] Jalankan semakan ralat selepas pembetulan