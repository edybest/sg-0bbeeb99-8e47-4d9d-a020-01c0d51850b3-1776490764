---
title: Thumbprint unlock on trusted device
status: done
priority: high
type: feature
tags:
- auth
- biometric
- whatsapp
- member
created_by: agent
created_at: 2026-04-24 06:19:34 UTC
position: 13
---

## Notes
Pengguna memilih flow nombor 2: selepas berjaya login menggunakan WhatsApp TAC pada device yang sama, app kini menawarkan prompt untuk aktifkan thumbprint pada device semasa jika WebAuthn platform authenticator disokong. Maklumat trusted device disimpan secara lokal melalui `biometricAuthService`, dan selepas setup berjaya sesi semasa terus ditanda sebagai telah unlocked supaya pengguna tidak diminta biometric semula sejurus selepas login TAC. Pada lawatan seterusnya ke kawasan member dengan sesi Supabase yang masih hidup, `MemberLayout` akan mengunci semula paparan dan meminta pengesahan thumbprint sebelum kandungan ahli dipaparkan. Jika biometric gagal atau pengguna mahu masuk semula dengan cara biasa, butang fallback `Guna WhatsApp TAC` masih tersedia dan akan sign out lalu bawa pengguna kembali ke login TAC.

## Checklist
- [x] Semak titik integrasi terbaik untuk setup thumbprint selepas login TAC
- [x] Sediakan servis WebAuthn untuk daftar dan sahkan biometric pada device semasa
- [x] Tambah prompt setup thumbprint selepas login TAC pertama
- [x] Tambah unlock flow pada kawasan member untuk sesi trusted device
- [x] Pastikan fallback TAC kekal tersedia jika biometric tidak disokong atau gagal
- [x] Jalankan semakan ralat selepas pelaksanaan

## Acceptance
Selepas login TAC berjaya, pengguna boleh aktifkan thumbprint pada device semasa.
Bila buka semula app pada device yang sama dengan sesi masih tersimpan, pengguna boleh masuk semula menggunakan thumbprint tanpa minta TAC dahulu.
Jika biometric gagal atau tidak disokong, flow TAC sedia ada masih boleh digunakan.