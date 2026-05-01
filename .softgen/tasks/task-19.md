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
- [x] Buat table `blok_join_queue` untuk simpan join session details
- [x] Buat table `blok_join_participants` untuk track siapa yang join
- [x] Setup RLS policies untuk kedua-dua table
- [ ] Parse #JOINBLOK message format dan extract game details
- [ ] Implement #join command handler dengan validation
- [ ] Implement #listjoin command untuk show current join list
- [ ] Handle duplicate join attempts dengan friendly message
- [ ] Handle unregistered phone numbers dengan friendly error
- [ ] Test dalam WhatsApp group sebenar

## Acceptance
✅ Admin post #JOINBLOK → new join session created in database
✅ Member post #join → validated and added to list with confirmation
✅ Duplicate join attempts → friendly "nama anda telah ada dalam list" message
✅ Unregistered phone → friendly "akaun anda tidak wujud" message
✅ #listjoin shows formatted participant list with numbers