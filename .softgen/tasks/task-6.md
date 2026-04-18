---
title: Fix gallery upload permissions and add album default cover setting
status: in_progress
priority: high
type: bug
tags:
  - gallery
  - admin
  - upload
  - album
created_by: agent
created_at: 2026-04-18
position: 6
---

## Notes
Siasatan menunjukkan punca utama datang daripada beza antara UI admin dan polisi database. Panel admin sebelum ini hanya mencipta rekod `gallery_permissions` tanpa mengaktifkan mana-mana flag `can_add_albums`, `can_add_images`, `can_edit_albums`, `can_edit_images`, `can_delete_albums`, atau `can_delete_images`. Dalam skema database, polisi RLS untuk `gallery_albums` dan `gallery_images` memeriksa flag-flag ini melalui `members.user_id = uid()`. Akibatnya, ahli nampak seperti telah diberi kebenaran dalam UI admin tetapi masih gagal upload. Selain itu, `gallery_albums.cover_image_url` memang wujud dalam skema dan digunakan pada muka depan album, tetapi UI belum menyediakan tindakan untuk menetapkannya daripada gambar sedia ada.

## Checklist
- [x] Siasat aliran semakan kebenaran upload galeri untuk username yang diluluskan admin.
- [x] Semak skema database dan struktur data galeri, album, dan permission yang digunakan semasa upload.
- [x] Betulkan punca upload gagal untuk username yang telah dibenarkan.
- [x] Tambah sokongan tetapan gambar default atau cover image untuk album.
- [x] Kemaskan UI admin atau galeri untuk memilih gambar sebagai cover album.
- [ ] Jalankan semakan ralat dan sahkan kedua-dua aliran berfungsi.