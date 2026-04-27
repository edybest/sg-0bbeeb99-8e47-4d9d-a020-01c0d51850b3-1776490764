---
title: WhatsApp Blok auto-registration
status: done
priority: high
type: feature
tags:
- whatsapp
- blok
- automation
- database
created_by: agent
created_at: 2026-04-27 05:38:47 UTC
position: 15
---

## Notes
Webhook WhatsApp AMBC kini menyokong auto-registration mesej dalam format `#blokambc dd.mm.yyyy`. Implementasi menggunakan route sedia ada `src/pages/api/whatsapp-webhook.ts` untuk baca mesej masuk, parse tarikh, normalkan nombor pengirim, padankan kepada ahli verified dalam jadual `members`, cari rekod game BLOK dalam jadual `games` berdasarkan `game_date`, dan simpan penyertaan pemain ke `game_players`. Duplicate dielakkan dengan semakan awal pada gabungan `game_id` dan `member_id`, selari dengan constraint unik database. Jika nombor tidak dikenali, tarikh tidak sah, tiada game BLOK pada tarikh tersebut, atau ada lebih daripada satu game BLOK yang ambigu pada tarikh sama, webhook akan tamat dengan selamat dan pulangkan mesej status yang jelas.

## Checklist
- [x] Semak webhook WhatsApp sedia ada dan format payload mesej masuk
- [x] Kenal pasti jadual database serta struktur data untuk senarai pemain Blok ikut tarikh
- [x] Implement parser mesej `#blokambc dd.mm.yyyy`
- [x] Implement logik padanan nombor pengirim kepada rekod ahli
- [x] Simpan penyertaan pemain Blok ke database untuk tarikh berkaitan tanpa duplicate
- [x] Tambah respons/error handling untuk nombor yang tidak dikenali atau data tidak lengkap
- [x] Jalankan semakan akhir selepas implementasi

## Acceptance
Apabila mesej `#blokambc dd.mm.yyyy` diterima oleh webhook daripada nombor ahli yang berdaftar, ahli itu ditambah ke senarai pemain BLOK untuk tarikh berkenaan.
Jika ahli sudah berdaftar, nombor tidak dikenali, atau game BLOK pada tarikh itu tiada, webhook tamat dengan selamat tanpa duplicate.
