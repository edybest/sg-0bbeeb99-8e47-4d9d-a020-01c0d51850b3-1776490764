---
title: Push notification background delivery
status: done
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
Pengguna melaporkan ahli yang sudah install PWA tidak menerima notification apabila admin hantar mesej selagi app tidak dibuka dahulu. Siasatan menunjukkan `src/components/admin/PushMessagePanel.tsx` memang memanggil Edge Function selepas simpan notifikasi in-app, dan `public/sw.js` sudah ada handler `push` serta `notificationclick`. Punca sebenar ialah `supabase/functions/send-push-notification/index.ts` masih cuba menghantar mesej menggunakan endpoint FCM legacy dengan `VAPID_PRIVATE_KEY` sebagai server key, sedangkan web push perlu dihantar melalui protokol Web Push sebenar dengan VAPID. Selain itu, `src/components/pwa/PwaInstallCard.tsx` hanya memaparkan prompt notification sejurus selepas install, jadi PWA yang sudah dipasang tetapi belum subscribe tiada laluan untuk hidupkan semula push. Pembetulan dibuat dengan menukar Edge Function kepada penghantaran Web Push sebenar, menghapuskan subscription rosak, menggunakan semakan subscription browser sebenar, dan memaparkan prompt notification untuk PWA yang sudah dipasang tetapi belum subscribe.

## Checklist
- [x] Semak aliran penghantaran mesej admin dalam panel push message
- [x] Semak servis push notification dan fungsi background delivery
- [x] Semak `public/sw.js` untuk event push dan notification click
- [x] Semak komponen PWA/install/permission untuk subscription push ahli
- [x] Betulkan punca sebenar supaya notification muncul walaupun app tidak dibuka
- [x] Jalankan semakan ralat dan tandakan task siap selepas lulus