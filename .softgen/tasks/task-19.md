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
- [ ] Test dalam WhatsApp group sebenar

## Acceptance
✅ Admin post #JOINBLOK → new join session created in database
✅ Member post #join → validated and added to list with confirmation
✅ Duplicate join attempts → friendly "nama anda telah ada dalam list" message
✅ Unregistered phone → friendly "akaun anda tidak wujud" message
✅ #listjoin shows formatted participant list with numbers