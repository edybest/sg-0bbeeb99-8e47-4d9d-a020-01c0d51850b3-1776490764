---
title: Push notification background delivery
status: in_progress
priority: high
type: bug
tags:
- pwa
- notification
- admin
- member
created_by: agent
created_at: 2026-04-23 13:05:32 UTC
position: 10
---

## Notes
Pengguna melaporkan ahli yang sudah install PWA tidak menerima notification apabila admin hantar mesej selagi app tidak dibuka dahulu. Ini menunjukkan isu pada aliran push notification background, sama ada pada subscription browser, penghantaran push dari admin, atau paparan notification dalam service worker. Fokus semasa ialah siasat dahulu dan sahkan punca dengan bukti daripada fail berkaitan sebelum buat pembetulan.

## Checklist
- [ ] Semak aliran penghantaran mesej admin dalam panel push message
- [ ] Semak servis push notification dan fungsi background delivery
- [ ] Semak `public/sw.js` untuk event push dan notification click
- [ ] Semak komponen PWA/install/permission untuk subscription push ahli
- [ ] Betulkan punca sebenar supaya notification muncul walaupun app tidak dibuka
- [ ] Jalankan semakan ralat dan tandakan task siap selepas lulus