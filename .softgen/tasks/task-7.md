---
title: Reset senarai ahli
status: in_progress
priority: high
type: feature
tags:
- admin
- lane
- reset
created_by: agent
created_at: 2026-04-23 04:53:40+00:00
position: 7
---

## Notes
Pengguna mahu satu fungsi untuk reset senarai ahli dalam Pengurusan Lane. Apabila digunakan, semua ahli yang sudah disusun ke mana-mana lane perlu dibuang daripada susunan semasa dan kembali ke senarai ahli supaya admin boleh susun semula dari awal. Fungsi ini perlu fokus pada susunan ahli, bukan pada lane undian atau lane sebenar.

## Checklist
- [ ] Semak sumber data susunan ahli dalam `src/components/admin/LaneManagement.tsx`
- [ ] Cari cara ahli ditandakan sebagai sudah disusun ke lane
- [ ] Tambah aksi reset untuk buang semua assignment ahli bagi game semasa
- [ ] Pastikan semua ahli kembali dipaparkan dalam senarai ahli belum susun
- [ ] Jalankan semakan ralat dan tandakan task siap selepas lulus