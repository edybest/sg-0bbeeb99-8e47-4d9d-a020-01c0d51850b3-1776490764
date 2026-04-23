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
Pengguna melaporkan ahli yang sudah install PWA tidak menerima notification apabila admin hantar mesej selagi app tidak dibuka dahulu. Siasatan terdahulu tertumpu pada background push. Maklum balas terbaru: notification baru telah dihantar kepada user `edy`, tetapi pada bahagian notification milik `edy` tiada notification baru diterima. Fokus semasa ialah semak semula flow simpan notification in-app, target member yang dipilih oleh admin, dan query inbox member untuk pastikan sasaran notifikasi benar-benar sampai kepada penerima yang betul.

## Checklist
- [x] Semak aliran penghantaran mesej admin dalam panel push message
- [x] Semak servis push notification dan fungsi background delivery
- [x] Semak `public/sw.js` untuk event push dan notification click
- [x] Semak komponen PWA/install/permission untuk subscription push ahli
- [ ] Semak flow simpan notification in-app untuk target user tertentu
- [ ] Semak query inbox member dan filter penerima notification
- [ ] Betulkan punca sebenar supaya notification muncul kepada penerima yang dipilih
- [ ] Jalankan semakan ralat dan tandakan task siap selepas lulus