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

Maklum balas terbaru meminta flow berasingan untuk `#joinblok`, `#join blok`, dan kini `#status`. Sistem perlu ikut post admin `#ambcblok` yang terbaru sebagai queue aktif, simpan queue sementara dalam Supabase, susun ahli mengikut urutan join daripada nombor telefon pengirim kepada `username` ahli, isi slot utama dari 1 hingga 42, kemudian sambung ke `Waiting List` ikut turutan. Jika nama sudah ada dalam queue, sistem balas bahawa nama telah ada dalam list. Jika tarikh BLOK yang aktif sudah lepas, sistem balas bahawa tarikh blok sudah lepas dan tiada rekod queue baharu dimasukkan. Untuk `#status`, sistem perlu semak ahli berdasarkan nombor telefon pengirim dan balas kedudukan semasa mereka sama ada dalam slot utama 1–42, dalam waiting list, atau belum berada dalam queue BLOK aktif. Flow ini hanya untuk susunan list join sementara, bukan untuk memasukkan rekod join terus ke `game_players`.

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
- [x] Jalankan semakan akhir selepas pembaikan

## Acceptance
Apabila ahli menghantar `#joinblok` atau `#join blok`, sistem mengambil queue BLOK aktif daripada post admin terbaru, menambah ahli ke slot utama 1 hingga 42 atau `Waiting List` mengikut turutan, dan menghantar balasan automatik dengan kedudukan join.
Apabila ahli menghantar `#status`, sistem membalas kedudukan semasa mereka dalam queue BLOK aktif atau memaklumkan bahawa mereka belum berada dalam senarai.
Jika ahli yang sama sudah ada dalam queue atau tarikh BLOK aktif telah lepas, sistem tidak menambah rekod baru dan menghantar balasan status yang sesuai.
