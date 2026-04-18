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
Siasatan awal telah membetulkan pemberian flag permission dan menambah tindakan cover album. Namun laporan terbaru menunjukkan isu masih berulang untuk kes sebenar: username `edy` yang telah dibenarkan admin masih tidak boleh upload ke galeri, dan untuk projek yang hanya mempunyai satu album, cover/default image masih tidak menjadi. Perlu semak semula aliran semakan permission berasaskan session pengguna sebenar, RLS schema semasa, dan cara UI memuat semula `cover_image_url` selepas tindakan set cover.

## Checklist
- [x] Siasat aliran semakan kebenaran upload galeri untuk username yang diluluskan admin.
- [x] Semak skema database dan struktur data galeri, album, dan permission yang digunakan semasa upload.
- [x] Betulkan punca upload gagal untuk username yang telah dibenarkan.
- [x] Tambah sokongan tetapan gambar default atau cover image untuk album.
- [x] Kemaskan UI admin atau galeri untuk memilih gambar sebagai cover album.
- [x] Jalankan semakan ralat dan sahkan kedua-dua aliran berfungsi.
- [ ] Sahkan semula pemetaan antara `members.user_id`, session login sebenar, dan `gallery_permissions` untuk username `edy`.
- [ ] Semak semula query dan polisi semasa upload gambar untuk cari punca sebenar kegagalan upload.
- [ ] Semak kenapa tindakan set cover album tidak kelihatan atau tidak kekal untuk album tunggal.
- [ ] Jalankan semakan ralat selepas pembetulan susulan.