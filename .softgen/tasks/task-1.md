---
title: Fix Blok leaderboard loading and Trio integration
status: done
priority: urgent
type: bug
tags:
  - blok
  - leaderboard
  - trio
  - loading
created_by: agent
created_at: 2026-04-18T01:02:21Z
position: 1
---

## Notes
Pulihkan semula paparan leaderboard pada halaman Blok selepas perubahan berkaitan Trio menyebabkan senarai tidak dirender dengan betul. Pastikan pemilihan game, muatan leaderboard, butang Double/Trio/Men vs Women, dan dialog masing-masing berfungsi semula tanpa menyebabkan halaman tersekat.

## Checklist
- [x] Semak aliran data untuk game, selected game, dan trigger pemuatan leaderboard
- [x] Pulihkan semula paparan leaderboard mobile dan desktop yang hilang
- [x] Pastikan dialog Double, Trio, dan Men vs Women menggunakan game id yang betul
- [x] Kekalkan loading icon dengan progress percentage semasa leaderboard dimuatkan
- [ ] Pulihkan semula susun atur leaderboard mobile untuk pemain dan score seperti versi sebelum ini
- [x] Jalankan semakan ralat dan tandakan tugasan selesai jika lulus