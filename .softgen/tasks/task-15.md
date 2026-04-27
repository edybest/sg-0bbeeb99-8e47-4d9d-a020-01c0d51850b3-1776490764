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
Pengguna mahu bila seseorang menghantar kod `#blokambc` ke nombor WhatsApp `60137503616`, sistem projek AMBC secara automatik memasukkan pengirim itu ke senarai pemain Blok mengikut tarikh ke dalam database. Implementasi perlu disambungkan dengan webhook WhatsApp sedia ada jika sudah wujud, semak bagaimana nombor telefon dipadankan dengan ahli, tentukan jadual Blok yang betul, dan elakkan pendaftaran berganda pada tarikh yang sama. Jika nombor WhatsApp tidak sepadan dengan mana-mana ahli, aliran perlu dikendalikan dengan jelas dan selamat.

## Checklist
- [ ] Semak webhook WhatsApp sedia ada dan format payload mesej masuk
- [ ] Kenal pasti jadual database serta struktur data untuk senarai pemain Blok ikut tarikh
- [ ] Implement logik padanan mesej `#blokambc` dari nombor pengirim kepada rekod ahli
- [ ] Simpan penyertaan pemain Blok ke database untuk tarikh berkaitan tanpa duplicate
- [ ] Tambah respons/error handling untuk nombor yang tidak dikenali atau data tidak lengkap
- [ ] Jalankan semakan akhir selepas implementasi