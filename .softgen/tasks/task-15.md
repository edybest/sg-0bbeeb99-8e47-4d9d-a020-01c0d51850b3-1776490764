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
Webhook WhatsApp AMBC kini menyokong auto-registration mesej dalam format `#blokambc dd.mm.yyyy` dan auto-reply status kepada pengirim. Flow tambahan untuk mesej panjang `#ambcblok` kini turut disokong: sistem mengesan tarikh seperti `29.04.2026`, cipta rekod game BLOK dalam jadual `games` jika belum wujud pada tarikh itu, baca senarai pemain bernombor dari `1.` hingga sebelum bahagian `Waiting List`, kemudian masukkan hanya pemain utama yang berjaya dipadankan ke `game_players`. Semua item selepas tajuk `Waiting List` diabaikan sepenuhnya.

Maklum balas terbaru meminta flow berasingan untuk `#joinblok`, `#join blok`, `#status`, notifikasi automatik apabila ahli dalam waiting list dinaikkan ke slot utama selepas ada kekosongan, dan kini sokongan supaya command yang sama berfungsi bila dihantar dalam WhatsApp group. Sistem perlu mengenal pasti nombor telefon penghantar sebenar daripada payload webhook group, bukan hanya ID group, supaya padanan ke jadual `members` kekal tepat untuk `#joinblok`, `#status`, `#blokambc`, dan command berkaitan lain.

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
- [x] Semak schema untuk jadual queue sementara join BLOK
- [x] Tambah storan Supabase untuk queue `#joinblok` berasaskan game BLOK aktif terbaru
- [x] Parse hashtag `#joinblok` dan `#join blok`
- [x] Padankan nombor telefon pengirim kepada ahli dan gunakan `username` untuk queue
- [x] Tolak join jika tarikh BLOK aktif sudah lepas
- [x] Semak duplicate nama dalam queue aktif
- [x] Susun slot utama 1 hingga 42 dan selepas itu ke waiting list ikut turutan
- [x] Hantar auto-reply kedudukan join atau mesej duplicate / tarikh lepas
- [x] Parse command `#status`
- [x] Semak kedudukan ahli dalam queue BLOK aktif berdasarkan nombor telefon pengirim
- [x] Hantar auto-reply sama ada ahli berada dalam slot utama, waiting list, atau belum join
- [x] Tambah log sementara payload webhook group ke console untuk semakan format
- [ ] Semak payload webhook mesej WhatsApp group untuk nombor penghantar sebenar
- [x] Tambah sokongan extractor penghantar untuk mesej group
- [x] Pastikan `#joinblok`, `#status`, dan command lain guna nombor peserta group sebenar
- [ ] Siasat semula kenapa hashtag group masih gagal selepas extractor baharu
- [ ] Semak log runtime webhook untuk request group sebenar dan hasil balasan
- [ ] Semak bagaimana slot kosong dicipta dalam queue BLOK semasa
- [ ] Tambah logik kenaikan waiting list ke slot utama
- [ ] Hantar notifikasi WhatsApp automatik kepada ahli yang naik ke slot utama
- [ ] Jalankan semakan akhir selepas pembaikan

## Acceptance
Apabila ahli menghantar `#joinblok` atau `#join blok`, sistem mengambil queue BLOK aktif daripada post admin terbaru, menambah ahli ke slot utama 1 hingga 42 atau `Waiting List` mengikut turutan, dan menghantar balasan automatik dengan kedudukan join.
Apabila ahli menghantar `#status`, sistem membalas kedudukan semasa mereka dalam queue BLOK aktif atau memaklumkan bahawa mereka belum berada dalam senarai.
Apabila command dihantar dalam WhatsApp group, sistem menggunakan nombor penghantar ahli sebenar untuk semakan dan balasan.
Apabila slot utama kosong dan ahli waiting list naik ke slot utama, ahli tersebut menerima mesej WhatsApp automatik bahawa mereka telah mendapat slot kosong.
