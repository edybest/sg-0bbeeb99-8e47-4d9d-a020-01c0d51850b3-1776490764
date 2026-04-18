---
title: Fix Blok leaderboard loading and Trio integration
status: in_progress
priority: urgent
type: bug
tags:
  - blok
  - leaderboard
  - trio
  - loading
created_by: agent
created_at: 2026-04-18T00:59:11 UTC
position: 1
---

## Notes
Halaman Blok masih gagal memaparkan leaderboard walaupun semakan lint, type check, dan runtime asas lulus. Perlu semak aliran selected game, trigger pemuatan leaderboard, dan perubahan Trio yang mungkin mengganggu logik sedia ada. Fokus pada pembaikan minimum yang memulihkan paparan leaderboard tanpa merosakkan fungsi Double, Trio, dan loading UI.

## Checklist
- [ ] Semak aliran state selected game, loadLeaderboard, dan useEffect dalam halaman Blok
- [ ] Kenal pasti baris kod yang menyebabkan leaderboard tidak dipanggil atau tidak dipaparkan
- [ ] Betulkan logik dengan perubahan minimum supaya leaderboard keluar semula
- [ ] Sahkan butang Double, Trio, dan Men vs Women masih gunakan game id yang betul
- [ ] Jalankan semakan ralat dan tandakan tugasan selesai jika lulus