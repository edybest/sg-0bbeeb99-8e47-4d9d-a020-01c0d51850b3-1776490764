---
title: Papar sembunyikan lane
status: in_progress
priority: high
type: bug
tags:
- admin
- lane
- visibility
created_by: agent
created_at: 2026-04-23 04:46:17+00:00
position: 6
---

## Notes
Pengguna melaporkan fungsi `Papar/Sembunyikan Lane` dalam Pengurusan Lane tidak berfungsi. Perlu semak logik state, handler toggle, dan render kad lane supaya setiap lane boleh disembunyikan dan dipaparkan semula dengan betul tanpa menjejaskan lane lain.

## Checklist
- [ ] Semak komponen `src/components/admin/LaneManagement.tsx` untuk handler `Papar/Sembunyikan Lane`
- [ ] Jejak state atau servis yang mengawal visibility lane
- [ ] Betulkan logik toggle supaya lane dipapar dan disembunyi dengan betul
- [ ] Jalankan semakan ralat dan tandakan task siap selepas lulus