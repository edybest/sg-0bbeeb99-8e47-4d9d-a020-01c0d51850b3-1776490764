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
Pengguna melaporkan ahli yang sudah install PWA tidak menerima notification apabila admin hantar mesej selagi app tidak dibuka dahulu. Siasatan terdahulu tertumpu pada background push. Maklum balas terbaru: notification baru telah dihantar kepada user `edy`, tetapi pada bahagian notification milik `edy` tiada notification baru diterima. Semakan DB mengesahkan notifikasi terbaru memang sudah direkodkan untuk `EDY`, tetapi semua `notification_recipients.delivered_at` bernilai `NULL`. Pada masa yang sama, inbox di `src/services/notificationService.ts` menyusun data ikut `delivered_at`, jadi item baru tidak stabil dan boleh tidak muncul di bahagian atas. Pembetulan dibuat dengan backfill `delivered_at` bagi rekod lama daripada `notifications.created_at`, dan semua insert recipient baharu kini menyimpan `delivered_at` terus semasa notifikasi dicipta.

## Checklist
- [x] Semak aliran penghantaran mesej admin dalam panel push message
- [x] Semak servis push notification dan fungsi background delivery
- [x] Semak `public/sw.js` untuk event push dan notification click
- [x] Semak komponen PWA/install/permission untuk subscription push ahli
- [x] Semak flow simpan notification in-app untuk target user tertentu
- [x] Semak query inbox member dan filter penerima notification
- [x] Betulkan punca sebenar supaya notification muncul kepada penerima yang dipilih
- [x] Jalankan semakan ralat dan tandakan task siap selepas lulus