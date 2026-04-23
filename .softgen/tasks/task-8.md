---
title: Page lane sync dengan lane undian
status: in_progress
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
Pengguna mahu page lane ikut logik yang sama seperti Pengurusan Lane di admin. Bila lane sebenar ialah `?/?`, label slot dalam kotak mesti ikut nombor `lane undian`, bukan memaparkan `?A`, `?B`, atau `?C`. Selain itu, setting `papar/sembunyi lane` yang dibuat oleh admin perlu berfungsi juga pada page lane supaya lane yang disembunyikan tidak dipaparkan kepada ahli. Evidence semasa menunjukkan admin masih guna state tempatan `hiddenLanes`, jadi visibility perlu dipersistkan supaya page member boleh membaca nilai yang sama.

## Checklist
- [x] Semak implementasi `src/pages/member/lane.tsx` untuk sumber label slot dan render lane
- [x] Kenal pasti bagaimana page lane membaca `lane_sebenar`, `lane_undian`, dan visibility lane
- [x] Betulkan label slot supaya bila `lane_sebenar` ialah `?/?`, slot ikut `lane_undian`
- [ ] Sambungkan setting `papar/sembunyi lane` admin pada page lane
- [ ] Jalankan semakan ralat dan tandakan task siap selepas lulus