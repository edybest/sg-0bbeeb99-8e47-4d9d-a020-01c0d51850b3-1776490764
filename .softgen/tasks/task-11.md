---
title: Bunyi notifikasi PWA
status: in_progress
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
Pengguna mahu tambah bunyi notifikasi pada PWA, sebaiknya bunyi strike setiap kali ada notification baharu. Perlu semak dahulu aliran notification sedia ada pada service worker dan komponen notification/inbox untuk tentukan sama ada bunyi dimainkan ketika app sedang dibuka, ketika push diterima, atau kedua-duanya. Gunakan aset audio sedia ada jika sesuai dan pastikan tingkah laku tidak mengganggu pengalaman pengguna.

## Checklist
- [ ] Semak aliran push/notifikasi semasa pada service worker dan komponen notification
- [ ] Tentukan sumber audio strike yang akan digunakan dalam projek
- [ ] Tambah bunyi apabila notification baharu diterima pada PWA
- [ ] Pastikan bunyi tidak berulang tanpa sebab dan hanya dimainkan untuk notification baharu
- [ ] Jalankan semakan ralat selepas pelaksanaan