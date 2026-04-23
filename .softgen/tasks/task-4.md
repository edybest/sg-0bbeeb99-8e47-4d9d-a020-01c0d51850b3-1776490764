---
title: Reset lane sebenar
status: in_progress
priority: high
type: feature
tags:
- admin
- lane
- reset
created_by: agent
created_at: 2026-04-23 04:27:39+00:00
position: 4
---

## Notes
Pengguna mahu butang reset dalam Pengurusan Lane menjadikan semua paparan lane sebenar kepada ?/? sahaja. Ia tidak patut menambah teks "Sebenar: ?/?" pada senarai ahli dan tidak patut mengubah bahagian lain yang tidak berkaitan. Perlu semak implementasi semasa dalam LaneManagement dan betulkan aliran reset berdasarkan kod sebenar.

## Checklist
- [ ] Cari implementasi semasa reset lane dalam `src/components/admin/LaneManagement.tsx`
- [ ] Sahkan sumber paparan `LANE SEBENAR` dalam komponen lane
- [ ] Ubah fungsi reset supaya semua lane sebenar menjadi `?/?`
- [ ] Buang sebarang teks `Sebenar: ?/?` daripada senarai ahli jika masih ada
- [ ] Jalankan semakan ralat dan tandakan task siap selepas lulus