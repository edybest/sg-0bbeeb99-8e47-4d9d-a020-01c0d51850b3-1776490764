---
title: Table lane 17/18 dan 19/20
status: done
priority: high
type: feature
tags:
- admin
- lane
- layout
created_by: agent
created_at: 2026-04-23 04:41:25+00:00
position: 5
---

## Notes
Pengguna melaporkan table tambahan untuk lane 17/18 dan 19/20 masih belum dipaparkan dalam Pengurusan Lane. Punca sebenar ialah komponen membaca data daripada `lane_configurations`, jadi kedua-dua rekod itu perlu benar-benar wujud dalam database. Rekod `17/18` dan `19/20` telah dipastikan wujud dengan susunan `position_order` 9 dan 10 supaya kedua-dua table boleh dirender selepas data dimuat semula.

## Checklist
- [x] Semak sumber senarai lane yang digunakan untuk render table lane
- [x] Pastikan lane 17/18 dan 19/20 dimasukkan dalam konfigurasi render
- [x] Sahkan tiada logik lain yang menapis atau menghadkan jumlah table
- [x] Jalankan semakan ralat dan tandakan task siap selepas lulus