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
Pengguna melaporkan dua isu berkaitan galeri. Pertama, username yang telah dibenarkan oleh admin untuk memuat naik ke galeri masih gagal semasa proses upload. Kedua, tiada fungsi untuk menetapkan gambar default bagi paparan muka depan album. Perlu siasat aliran kebenaran upload di bahagian admin, halaman ahli, servis galeri, dan skema pangkalan data berkaitan album atau cover image sebelum membetulkan punca sebenar dan menambah tetapan cover album.

## Checklist
- [ ] Siasat aliran semakan kebenaran upload galeri untuk username yang diluluskan admin.
- [ ] Semak skema database dan struktur data galeri, album, dan permission yang digunakan semasa upload.
- [ ] Betulkan punca upload gagal untuk username yang telah dibenarkan.
- [ ] Tambah sokongan tetapan gambar default atau cover image untuk album.
- [ ] Kemaskan UI admin atau galeri untuk memilih gambar sebagai cover album.
- [ ] Jalankan semakan ralat dan sahkan kedua-dua aliran berfungsi.