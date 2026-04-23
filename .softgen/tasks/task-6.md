---
title: Papar sembunyikan lane
status: done
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
Pengguna melaporkan fungsi `Papar/Sembunyikan Lane` dalam Pengurusan Lane tidak berfungsi. Punca sebenar ialah state `hiddenLanes` dan handler toggle sudah wujud, tetapi render grid masih menggunakan `laneConfigs.map(...)` tanpa sebarang tapisan. Pembetulan dibuat dengan menapis `laneConfigs` berdasarkan `config.lane_undian` sebelum render kad lane.

## Checklist
- [x] Semak komponen `src/components/admin/LaneManagement.tsx` untuk handler `Papar/Sembunyikan Lane`
- [x] Jejak state atau servis yang mengawal visibility lane
- [x] Betulkan logik toggle supaya lane dipapar dan disembunyi dengan betul
- [x] Jalankan semakan ralat dan tandakan task siap selepas lulus