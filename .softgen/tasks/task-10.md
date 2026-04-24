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
Pengguna melaporkan ahli yang sudah install PWA tidak menerima notification apabila admin hantar mesej selagi app tidak dibuka dahulu. Siasatan terdahulu tertumpu pada background push. Maklum balas terbaru menunjukkan panel admin memaparkan `0/0 berjaya` bersama ralat `Edge Function returned a non-2xx status code`. Ini bermaksud fungsi `send-push-notification` dipanggil tetapi memulangkan status gagal sebelum butiran delivery sebenar sempat dipaparkan. Fokus semasa ialah mengenal pasti punca non-2xx tersebut dan membaiki UI supaya mesej ralat sebenar dipaparkan dengan tepat.

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
- [ ] Semak punca status non-2xx daripada Edge Function
- [ ] Baiki paparan mesej ralat sebenar pada panel admin
- [ ] Jalankan semakan ralat selepas pembetulan