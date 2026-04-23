---
title: Reset lane sebenar
status: done
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
Pengguna mahu butang reset dalam Pengurusan Lane menjadikan semua paparan lane sebenar kepada ?/? sahaja. Sumber paparan itu datang daripada `config.lane_sebenar` pada kad lane, bukan daripada senarai ahli. Senarai ahli tidak perlu memaparkan teks tambahan `Sebenar: ?/?`. Tambahan pembetulan terbaru: apabila lane sebenar ialah `?/?`, label slot di dalam kotak masih mesti ikut nombor `lane undian`, contohnya lane undian `1/2` perlu memaparkan `1A 1B 1C` dan `2A 2B 2C`, bukan `?A ?B ?C`.

## Checklist
- [x] Cari implementasi semasa reset lane dalam `src/components/admin/LaneManagement.tsx`
- [x] Sahkan sumber paparan `LANE SEBENAR` dalam komponen lane
- [x] Ubah fungsi reset supaya semua lane sebenar menjadi `?/?`
- [x] Buang sebarang teks `Sebenar: ?/?` daripada senarai ahli jika masih ada
- [x] Betulkan label slot supaya apabila lane sebenar `?/?`, nombor slot ikut `lane undian`
- [x] Jalankan semakan ralat dan tandakan task siap selepas lulus