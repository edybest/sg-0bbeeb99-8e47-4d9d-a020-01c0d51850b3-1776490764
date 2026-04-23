---
title: Page lane sync dengan lane undian
status: done
priority: high
type: bug
tags:
- member
- lane
- admin
created_by: agent
created_at: 2026-04-23 04:59:45 UTC
position: 8
---

## Notes
Pengguna mahu page lane ikut logik yang sama seperti Pengurusan Lane di admin. Bila lane sebenar ialah `?/?`, label slot dalam kotak mesti ikut nombor `lane undian`, bukan memaparkan `?A`, `?B`, atau `?C`. Selain itu, setting `papar/sembunyi lane` yang dibuat oleh admin perlu berfungsi juga pada page lane supaya lane yang disembunyikan tidak dipaparkan kepada ahli. Maklum balas terbaru menunjukkan state untick tidak kekal selepas refresh. Punca sebenar ialah handler toggle di admin hanya mengubah state tempatan tanpa memanggil `saveHiddenLaneUndian()`. Persistence kini disambungkan semula ke `club_settings`, sementara page member dan admin kedua-duanya sudah membaca nilai tersimpan melalui `getHiddenLaneUndian()` semasa load.

## Checklist
- [x] Semak implementasi `src/pages/member/lane.tsx` untuk sumber label slot dan render lane
- [x] Kenal pasti bagaimana page lane membaca `lane_sebenar`, `lane_undian`, dan visibility lane
- [x] Betulkan label slot supaya bila `lane_sebenar` ialah `?/?`, slot ikut `lane_undian`
- [x] Semak semula handler toggle visibility di admin
- [x] Semak query simpan/baca `hidden lane` dalam `src/services/laneService.ts`
- [x] Betulkan persistence supaya untick kekal selepas refresh di admin dan page lane
- [x] Jalankan semakan ralat dan tandakan task siap selepas lulus