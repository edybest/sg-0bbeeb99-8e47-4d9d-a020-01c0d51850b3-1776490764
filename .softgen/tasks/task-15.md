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
Webhook WhatsApp AMBC kini menyokong auto-registration mesej dalam format `#blokambc dd.mm.yyyy`. Implementasi menggunakan route sedia ada `src/pages/api/whatsapp-webhook.ts` untuk baca mesej masuk, parse tarikh, normalkan nombor pengirim, padankan kepada ahli verified dalam jadual `members`, cari rekod game BLOK dalam jadual `games` berdasarkan `game_date`, dan simpan penyertaan pemain ke `game_players`. Duplicate dielakkan dengan semakan awal pada gabungan `game_id` dan `member_id`, selari dengan constraint unik database.

Flow ini turut menghantar balasan WhatsApp automatik kepada pengirim selepas cubaan daftar melalui `#blokambc`. Maklum balas terbaru menunjukkan percubaan WhatsApp ke nombor webhook tidak menghasilkan rekod baru dalam database, jadi siasatan perlu fokus pada payload webhook sebenar, padanan nombor pengirim, carian game BLOK ikut tarikh, dan sebarang ralat server/log semasa proses masuk.

Maklum balas baharu meminta command `#blok dd.mm.yyyy` untuk WhatsApp group yang akan menghantar senarai automatik 10 juara teratas beserta overall score mereka untuk game BLOK pada tarikh tersebut. Sistem perlu ambil data score dari `game_players` atau jadual score yang berkaitan, susun mengikut kedudukan, dan format sebagai mesej WhatsApp yang kemas untuk dihantar ke group.

## Checklist
- [x] Semak webhook WhatsApp sedia ada dan format payload mesej masuk
- [x] Kenal pasti jadual database serta struktur data untuk senarai pemain Blok ikut tarikh
- [x] Implement parser mesej `#blokambc dd.mm.yyyy`
- [x] Implement logik padanan nombor pengirim kepada rekod ahli
- [x] Simpan penyertaan pemain Blok ke database untuk tarikh berkaitan tanpa duplicate
- [x] Tambah respons/error handling untuk nombor yang tidak dikenali atau data tidak lengkap
- [x] Semak utiliti penghantaran WhatsApp sedia ada untuk auto-reply
- [x] Hantar balasan automatik WhatsApp untuk status berjaya atau gagal
- [ ] Semak log webhook dan payload WhatsApp sebenar bagi percubaan terbaru
- [ ] Sahkan punca kegagalan insert ke database
- [ ] Terapkan pembaikan minimum yang diperlukan
- [ ] Semak schema untuk jadual score dan overall score BLOK
- [ ] Implement parser mesej `#blok dd.mm.yyyy` untuk query top 10
- [ ] Query top 10 juara dari database berdasarkan overall score
- [ ] Format senarai juara sebagai mesej WhatsApp yang kemas
- [ ] Hantar auto-reply senarai juara ke WhatsApp group
- [ ] Jalankan semakan akhir selepas semua command siap

## Acceptance
Apabila mesej `#blokambc dd.mm.yyyy` diterima oleh webhook daripada nombor ahli yang berdaftar, ahli itu ditambah ke senarai pemain BLOK untuk tarikh berkenaan dan menerima balasan pengesahan.
Jika ahli sudah berdaftar, nombor tidak dikenali, atau game BLOK pada tarikh itu tiada, webhook tamat dengan selamat dan menghantar balasan status yang sesuai.
Apabila mesej `#blok dd.mm.yyyy` diterima dalam WhatsApp group, sistem menghantar senarai 10 juara teratas dengan overall score mereka untuk game BLOK pada tarikh tersebut.
