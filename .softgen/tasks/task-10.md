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
Pengguna melaporkan ahli yang sudah install PWA tidak menerima notification apabila admin hantar mesej selagi app tidak dibuka dahulu. Siasatan terdahulu tertumpu pada background push. Maklum balas terbaru: notification baru telah dihantar kepada user `edy`, tetapi pada bahagian notification milik `edy` tiada notification baru diterima. Semakan DB sebelum ini mengesahkan notifikasi terbaru memang sudah direkodkan untuk `EDY`, dan isu `delivered_at` sudah dibetulkan. Permintaan semasa ialah menyemak jadual `push_subscriptions` untuk user `edy` dan mengesahkan status subscription serta endpoint device yang tersimpan.

## Checklist
- [x] Semak aliran penghantaran mesej admin dalam panel push message
- [x] Semak servis push notification dan fungsi background delivery
- [x] Semak `public/sw.js` untuk event push dan notification click
- [x] Semak komponen PWA/install/permission untuk subscription push ahli
- [x] Semak flow simpan notification in-app untuk target user tertentu
- [x] Semak query inbox member dan filter penerima notification
- [ ] Semak rekod `push_subscriptions` untuk user `edy`
- [ ] Sahkan status subscription dan endpoint device semasa
- [ ] Tentukan sama ada subscription semasa sepadan dengan aliran push yang dihantar