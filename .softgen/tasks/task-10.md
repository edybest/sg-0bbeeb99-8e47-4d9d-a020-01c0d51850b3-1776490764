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
Pengguna melaporkan ahli yang sudah install PWA tidak menerima notification apabila admin hantar mesej selagi app tidak dibuka dahulu. Siasatan terdahulu tertumpu pada background push. Maklum balas terbaru: notification baru telah dihantar kepada user `edy`, tetapi pada bahagian notification milik `edy` tiada notification baru diterima. Semakan DB mengesahkan subscription push untuk `EDY` wujud sebelum notifikasi dihantar, dan rekod notification in-app juga memang sampai kepada `EDY`. Memandangkan log Edge Function tidak boleh dibaca terus dari sini, observability ditambah pada aliran push: `send-push-notification` kini memulangkan butiran delivery sebenar termasuk `memberId`, status berjaya/gagal, endpoint ringkas, kod status, dan mesej ralat. Panel admin pula memaparkan hasil penghantaran push sebenar selepas mesej dihantar, jadi kegagalan delivery boleh terus dikenal pasti tanpa perlu buka log luar.

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
- [x] Jalankan semakan ralat selepas penambahbaikan observability