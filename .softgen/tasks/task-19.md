---
title: WhatsApp auto-join blok feature
status: in_progress
priority: high
type: feature
tags:
  - whatsapp
  - webhook
  - auto-join
  - group
created_by: agent
created_at: 2026-04-29T16:00:00Z
position: 19
---

## Notes
Buat sistem auto-join untuk WhatsApp group AMBC. Bila admin post dengan `#JOINBLOK`, bot buat join session baru. Member boleh post `#join` untuk join, dan bot akan validate phone number + tambah nama dalam list. Bot akan balas dengan confirmation dan track semua dalam database `blok_join_queue` dan `blok_join_participants`.

Format sync `#ambc`: butiran sesi dan senarai peserta datang daripada mesej admin. Nama yang sudah bayar akan ditanda terus dalam senarai peserta dengan format seperti `1. AA ✅ 76` atau `2. Farah ©️ 66`. Simbol + teks selepas username akan disimpan dan dipaparkan semula dalam reply `#join`, `#listjoin`, dan `#cancel`. Command ini hanya sync rekod aktif, tanpa menghantar WhatsApp reply.

Bug semasa: webhook untuk mesej WhatsApp group salah normalize nombor telefon yang bermula dengan kod negara Singapura `65`. Logik semasa menganggap nombor antarabangsa yang sah hanyalah `60`, jadi nombor `65...` ditukar salah kepada `+60...` sebelum lookup member, menyebabkan command seperti `#join` dan `#cancel` gagal untuk ahli Singapura. Pembetulan perlu menyokong sekurang-kurangnya nombor Malaysia (`60`) dan Singapura (`65`) dalam semua laluan normalisasi, termasuk format dengan awalan `+`, awalan tempatan, suffix `@s.whatsapp.net`, dan suffix peranti seperti `:12@s.whatsapp.net`.

## Checklist
- [x] Buat table `whatsapp_join_sessions` untuk simpan join session details
- [x] Buat table `whatsapp_join_participants` untuk track siapa yang join
- [x] Setup RLS policies untuk kedua-dua table
- [x] Parse #JOINBLOK message format dan extract game details
- [x] Implement #join command handler dengan validation
- [x] Implement #listjoin command untuk show current join list
- [x] Handle duplicate join attempts dengan friendly message
- [x] Handle unregistered phone numbers dengan friendly error
- [x] Fix Fonnte webhook payload parsing untuk WhatsApp Groups: guna field `participant` untuk member lookup bila `sender` adalah group ID (`@g.us`). Log the full payload.
- [x] Normalize nombor telefon group/personal dengan buang semua suffix WhatsApp supaya lookup member konsisten.
- [x] Kurangkan latency reply webhook dengan logging async production-only dan terus reply ke group sender tanpa lookup tambahan.
- [x] Aktifkan logging webhook dalam development supaya payload group sebenar dapat disahkan semasa ujian.
- [x] Tambah fallback extraction untuk cari nombor ahli daripada payload group bila field utama kosong atau format berbeza.
- [x] Buang suffix JID peranti seperti `:12@s.whatsapp.net` sebelum lookup nombor ahli group dibuat.
- [x] Padankan semua calon nombor daripada payload group dengan `members.phone` dan guna hanya nombor yang benar-benar jumpa ahli.
- [x] Tukar copy reply `#listjoin` dan `#join` berjaya kepada template promosi tetap dengan butiran sesi yang dinamik.
- [x] Tambah command `#cancel` supaya ahli boleh batalkan penyertaan mereka sendiri daripada sesi join aktif.
- [x] Tambah command `#ambc` untuk sync butiran sesi, senarai peserta, dan status bayaran tanpa menghantar reply.
- [x] Kurangkan latency `#join` dan `#cancel` dengan reuse ahli yang sudah dijumpai daripada payload group dan elak scan fallback bila `participant` sudah padan.
- [x] Tambah waiting list automatik: peserta ke-43 dan seterusnya dipaparkan di bawah `Waiting List`, dan turutan naik sendiri bila ada `#cancel`.
- [x] Tambah command tersembunyi `#theboy` yang balas `ambc the boy always wins!!!` tanpa dipaparkan dalam `#help`.
- [x] Simpan dan paparkan simbol + teks selepas username (contoh: `✅️ 76`, `©️ 66`) yang admin set melalui `#ambc` sync dalam semua reply `#join`, `#listjoin`, dan `#cancel`.
- [x] Buang duplicate nama dalam sync `#ambc` secara case-insensitive dengan kekalkan kemasukan pertama dan skip nama sama yang datang kemudian.
- [x] Sokong normalisasi nombor telefon berkod negara `65` selain `60` supaya ahli Singapura boleh dikenal pasti dalam webhook group dan direct chat.
- [x] Pastikan nombor `65...` tidak dipaksa menjadi `+60...` dalam lookup `participant`, fallback payload scan, dan reply target normalization.
- [ ] Uji `#join` dan `#cancel` untuk satu ahli Malaysia dan satu ahli Singapura menggunakan format nombor WhatsApp yang berbeza (`65...`, `+65...`, `65...@s.whatsapp.net`, `65...:12@s.whatsapp.net`).
- [ ] Test dalam WhatsApp group sebenar

## Acceptance
✅ Admin post #JOINBLOK → new join session created in database
✅ Member post #join → validated and added to list with confirmation
✅ Member post #cancel → nama sendiri dikeluarkan daripada sesi join aktif dengan balasan yang jelas
✅ #listjoin shows formatted participant list with numbers
✅ Peserta ke-43 dan seterusnya muncul dalam `Waiting List`, dan peserta waiting list teratas naik automatik bila slot kosong