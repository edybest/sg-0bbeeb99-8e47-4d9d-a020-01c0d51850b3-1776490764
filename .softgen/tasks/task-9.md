---
title: Jarak atas page member
status: done
priority: high
type: bug
tags:
- member
- layout
- mobile
created_by: agent
created_at: 2026-04-23 12:47:42 UTC
position: 9
---

## Notes
Pengguna melaporkan beberapa page member tertutup dengan header tetap pada paparan mudah alih. Contoh yang diberi ialah page five-five, di mana kandungan bermula terlalu rapat ke atas sehingga sebahagiannya terlindung di bawah header. Punca semasa datang daripada `MemberTopBarNav` yang menggunakan header tetap, manakala `MemberLayout` belum memberi offset atas yang konsisten pada wrapper kandungan. Pembetulan dibuat pada layout global supaya semua page member yang guna layout ini turun sedikit tanpa perlu ubah satu per satu.

## Checklist
- [x] Semak komponen layout/header yang dikongsi oleh page member
- [x] Kenal pasti bagaimana page five-five meletakkan kandungan utama di bawah header
- [x] Betulkan jarak atas global atau pada wrapper yang betul supaya kandungan tidak tertutup
- [x] Sahkan perubahan tidak mengganggu bottom nav atau spacing page member lain
- [x] Jalankan semakan ralat dan tandakan task siap selepas lulus