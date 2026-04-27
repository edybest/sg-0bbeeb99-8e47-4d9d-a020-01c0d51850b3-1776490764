---
title: WhatsApp Blok auto-registration
status: in_progress
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
Webhook WhatsApp AMBC kini menyokong auto-registration mesej dalam format `#blokambc dd.mm.yyyy` dan auto-reply status kepada pengirim. Maklum balas terbaru meminta flow tambahan untuk mesej panjang yang mengandungi hashtag `#ambcblok`: sistem perlu kesan tarikh seperti `29.04.2026`, cipta rekod game BLOK jika belum wujud pada tarikh itu, baca senarai pemain bernombor bermula dari `1.` hingga sebelum bahagian `Waiting List`, kemudian masukkan pemain utama sahaja ke database. Item dalam `Waiting List` mesti diabaikan sepenuhnya.

Implementasi perlu mengekalkan perlindungan duplicate, padankan nama pemain kepada ahli sedia ada jika boleh, dan selaraskan penciptaan game dengan struktur jadual `games` serta `game_players` yang digunakan oleh aplikasi AMBC sekarang. Balasan WhatsApp automatik juga perlu memberitahu berapa ramai pemain berjaya diimport, siapa yang diabaikan, dan jika ada nama yang tidak dapat dipadankan.

## Checklist
- [x] Semak webhook WhatsApp sedia ada dan format payload mesej masuk
- [x] Kenal pasti jadual database serta struktur data untuk senarai pemain Blok ikut tarikh
- [x] Implement parser mesej `#blokambc dd.mm.yyyy`
- [x] Implement logik padanan nombor pengirim kepada rekod ahli
- [x] Simpan penyertaan pemain Blok ke database untuk tarikh berkaitan tanpa duplicate
- [x] Tambah respons/error handling untuk nombor yang tidak dikenali atau data tidak lengkap
- [x] Semak utiliti penghantaran WhatsApp sedia ada untuk auto-reply
- [x] Hantar balasan automatik WhatsApp untuk status berjaya atau gagal
- [ ] Semak schema terkini `games`, `game_players`, dan `members` untuk flow import pukal
- [ ] Semak pola penciptaan game BLOK sedia ada dalam kod admin/app
- [ ] Implement parser mesej `#ambcblok` untuk ambil tarikh dan senarai pemain utama sahaja
- [ ] Auto-create game BLOK mengikut tarikh jika belum wujud
- [ ] Padankan nama pemain kepada ahli dan simpan ke `game_players` tanpa duplicate
- [ ] Abaikan semua entri selepas tajuk `Waiting List`
- [ ] Hantar ringkasan auto-reply bagi jumlah berjaya, duplicate, dan nama yang tidak dipadankan
- [ ] Jalankan semakan akhir selepas pembaikan

## Acceptance
Apabila mesej WhatsApp yang mengandungi `#ambcblok` diterima, sistem mengesan tarikh mesej, mencipta game BLOK jika belum ada, dan menambah hanya pemain utama sebelum bahagian `Waiting List` ke database.
Entri dalam `Waiting List` tidak dimasukkan ke database, dan pengirim menerima balasan ringkas tentang hasil import pemain.
