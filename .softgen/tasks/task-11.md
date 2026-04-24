---
title: Bunyi notifikasi PWA
status: done
priority: medium
type: feature
tags:
- pwa
- notification
- audio
- member
created_by: agent
created_at: 2026-04-24 05:57:14 UTC
position: 11
---

## Notes
Pengguna mahu tambah bunyi notifikasi pada PWA, sebaiknya bunyi strike setiap kali ada notification baharu. Pelaksanaan dibuat pada aliran PWA yang sedang terbuka: `public/sw.js` kini menghantar mesej `push-received` kepada client app bila push diterima, dan `src/components/notifications/NotificationBell.tsx` mendengar mesej itu lalu menyemak semula unread count. Bila unread count meningkat, app memainkan aset audio sedia ada `/win.mp3`, memaparkan toast, dan mengaktifkan animasi bell. Perlindungan tambahan turut dimasukkan supaya bunyi tidak dimainkan berulang kali dalam sela masa yang terlalu rapat.

## Checklist
- [x] Semak aliran push/notifikasi semasa pada service worker dan komponen notification
- [x] Tentukan sumber audio strike yang akan digunakan dalam projek
- [x] Tambah bunyi apabila notification baharu diterima pada PWA
- [x] Pastikan bunyi tidak berulang tanpa sebab dan hanya dimainkan untuk notification baharu
- [x] Jalankan semakan ralat selepas pelaksanaan