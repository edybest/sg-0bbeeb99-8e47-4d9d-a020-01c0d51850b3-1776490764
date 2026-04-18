---
title: Reka bentuk Podium Leaderboard di halaman Blok
status: in_progress
priority: high
type: feature
tags:
  - ui
  - leaderboard
  - blok
---

## Notes
Pengguna mahu halaman Blok mempunyai leaderboard gaya podium untuk Top 3 seperti dalam screenshot rujukan.
Maklumat terperinci seperti G1-G5, average, handicap, difference, dan total perlu dikekalkan.

Cadangan penyelesaian:
1. Bina komponen podium 3D menggunakan Tailwind CSS untuk Top 3 pemain.
2. Letakkan podium di bahagian atas senarai.
3. Kekalkan senarai kad terperinci di bawah podium. Supaya maklumat G1-G5 untuk Top 3 boleh dilihat, kita boleh sama ada memasukkan mereka dalam senarai bawah atau membenarkan podium diklik untuk melihat butiran. Paling selamat: paparkan podium sebagai highlight, dan senarai detail di bawah memaparkan semua pemain atau klik untuk expand.

## Checklist
- [ ] Buka `src/pages/member/blok.tsx`.
- [ ] Asingkan data Top 3 dan bakinya.
- [ ] Reka komponen Podium 3D.
- [ ] Pastikan butiran markah (G1-G5, dll) masih boleh diakses untuk semua pemain.
- [ ] Uji responsiviti pada mobile.