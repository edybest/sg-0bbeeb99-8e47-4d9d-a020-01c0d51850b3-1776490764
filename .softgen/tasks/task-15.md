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
Webhook WhatsApp AMBC kini menyokong auto-registration mesej dalam format `#blokambc dd.mm.yyyy` dan auto-reply status kepada pengirim. Flow tambahan untuk mesej panjang `#ambcblok` kini turut disokong: sistem mengesan tarikh seperti `29.04.2026`, cipta rekod game BLOK dalam jadual `games` jika belum wujud pada tarikh itu, baca senarai pemain bernombor dari `1.` hingga sebelum bahagian `Waiting List`, kemudian masukkan hanya pemain utama yang berjaya dipadankan ke `game_players`. Semua item selepas tajuk `Waiting List` diabaikan sepenuhnya.

Padanan nama pemain dibuat terhadap `username` dan `full_name` ahli verified dalam jadual `members`, dengan normalisasi teks untuk kurangkan perbezaan format. Duplicate kekal dilindungi melalui semakan awal terhadap pasangan `game_id` dan `member_id` serta constraint unik database. Balasan WhatsApp automatik kini merumuskan jumlah pemain berjaya diimport, duplicate yang diabaikan, nama yang tidak dapat dipadankan, dan sama ada game BLOK dicipta baharu atau menggunakan rekod sedia ada. Pembaikan tambahan turut menyokong kedua-dua hashtag pembuka `#ambcblok` dan `#blokambc` untuk mesej import pukal supaya broadcast sebenar terus diproses.

## Checklist
- [x] Semak webhook WhatsApp sedia ada dan format payload mesej masuk
- [x] Kenal pasti jadual database serta struktur data untuk senarai pemain Blok ikut tarikh
- [x] Implement parser mesej `#blokambc dd.mm.yyyy`
- [x] Implement logik padanan nombor pengirim kepada rekod ahli
- [x] Simpan penyertaan pemain Blok ke database untuk tarikh berkaitan tanpa duplicate
- [x] Tambah respons/error handling untuk nombor yang tidak dikenali atau data tidak lengkap
- [x] Semak utiliti penghantaran WhatsApp sedia ada untuk auto-reply
- [x] Hantar balasan automatik WhatsApp untuk status berjaya atau gagal
- [x] Semak schema terkini `games`, `game_players`, dan `members` untuk flow import pukal
- [x] Semak pola penciptaan game BLOK sedia ada dalam kod admin/app
- [x] Implement parser mesej `#ambcblok` untuk ambil tarikh dan senarai pemain utama sahaja
- [x] Auto-create game BLOK mengikut tarikh jika belum wujud
- [x] Padankan nama pemain kepada ahli dan simpan ke `game_players` tanpa duplicate
- [x] Abaikan semua entri selepas tajuk `Waiting List`
- [x] Hantar ringkasan auto-reply bagi jumlah berjaya, duplicate, dan nama yang tidak dipadankan
- [x] Sokong alias hashtag `#blokambc` untuk mesej import pukal
- [x] Jalankan semakan akhir selepas pembaikan

## Acceptance
Apabila mesej WhatsApp yang mengandungi `#ambcblok` diterima, sistem mengesan tarikh mesej, mencipta game BLOK jika belum ada, dan menambah hanya pemain utama sebelum bahagian `Waiting List` ke database.
Entri dalam `Waiting List` tidak dimasukkan ke database, dan pengirim menerima balasan ringkas tentang hasil import pemain.
