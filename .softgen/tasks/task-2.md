---
title: Ubah pengurusan Double kepada Double atau Trio dengan pilihan handicap
status: in_progress
priority: high
type: feature
tags:
  - admin
  - blok
  - game-management
  - trio
  - double
created_by: agent
created_at: 2026-04-18T01:26:43Z
position: 2
---

## Notes
Pengguna mahu aliran admin diubah supaya rekod berpasukan tidak lagi terhad kepada double sahaja. Admin perlu boleh memilih sama ada hendak mencipta rekod Double atau Trio. Untuk Double, admin pilih 2 pemain dan boleh tentukan sama ada jumlah score termasuk handicap atau tidak. Untuk Trio, admin pilih 3 pemain dan boleh tentukan sama ada jumlah score termasuk handicap atau tidak. Paparan di halaman Blok perlu terus menyokong kedua-dua jenis rekod dengan susunan score tertinggi di atas. Kekalkan fungsi sedia ada yang masih relevan dan elakkan memecahkan leaderboard utama.

Isu toggle Trio tidak update visual telah diselesaikan dengan menambah field `trio_enabled` dalam query `listGamesWithPlayers()` di `gameService.ts`. Toggle Men vs Women yang hilang juga telah dipulihkan.
