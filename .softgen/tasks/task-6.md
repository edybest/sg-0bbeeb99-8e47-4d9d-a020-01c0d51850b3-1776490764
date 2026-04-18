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
Siasatan awal telah membetulkan pemberian flag permission dan menambah tindakan cover album. Namun laporan terbaru menunjukkan isu masih berulang untuk kes sebenar: username `edy` yang telah dibenarkan admin masih tidak boleh upload ke galeri, dan untuk projek yang hanya mempunyai satu album, cover/default image masih tidak menjadi. Bukti query database menunjukkan punca sebenar ialah rekod `gallery_permissions` untuk `EDY` memang wujud tetapi semua flag `can_add_albums`, `can_edit_albums`, `can_delete_albums`, `can_add_images`, `can_edit_images`, dan `can_delete_images` masih `false`. Polisi RLS untuk `gallery_albums` dan `gallery_images` memerlukan flag-flag ini bernilai `true`, jadi upload dan set cover terus ditolak walaupun UI admin nampak seperti kebenaran telah diberi. Data legacy ini telah dibaiki pada database. Query album terkini juga menunjukkan `gallery_albums.cover_image_url` sudah wujud untuk album tunggal, jadi susulan frontend sekarang fokus pada kebolehlihatan tindakan cover pada mobile dan fallback paparan cover pada muka depan album.

## Checklist
- [x] Siasat aliran semakan kebenaran upload galeri untuk username yang diluluskan admin.
- [x] Semak skema database dan struktur data galeri, album, dan permission yang digunakan semasa upload.
- [x] Betulkan punca upload gagal untuk username yang telah dibenarkan.
- [x] Tambah sokongan tetapan gambar default atau cover image untuk album.
- [x] Kemaskan UI admin atau galeri untuk memilih gambar sebagai cover album.
- [x] Jalankan semakan ralat dan sahkan kedua-dua aliran berfungsi.
- [x] Sahkan semula pemetaan antara `members.user_id`, session login sebenar, dan `gallery_permissions` untuk username `edy`.
- [x] Semak semula query dan polisi semasa upload gambar untuk cari punca sebenar kegagalan upload.
- [x] Semak kenapa tindakan set cover album tidak kelihatan atau tidak kekal untuk album tunggal.
- [x] Baiki data legacy `gallery_permissions` yang masih menyimpan semua flag sebagai `false`.
- [x] Jelaskan tindakan set cover pada mobile supaya pengguna nampak butang cover dengan lebih jelas.
- [x] Tambah fallback paparan album card kepada `cover_image_url` yang sudah disimpan.
- [ ] Jalankan semakan akhir bersama pengguna pada peranti sebenar selepas pembaikan data.