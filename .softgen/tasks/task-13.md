---
title: Thumbprint unlock on trusted device
status: in_progress
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
Pengguna memilih flow nombor 2: selepas berjaya login menggunakan WhatsApp TAC pada device yang sama, app perlu benarkan pembukaan semula sesi menggunakan thumbprint/biometric tanpa minta TAC setiap kali. Flow ini akan bertindak sebagai trusted device unlock untuk device semasa, bukan pengganti login penuh pada device baharu. Implementasi perlu semak sokongan WebAuthn/biometric pada browser, sediakan pendaftaran thumbprint selepas login TAC, dan tambah skrin unlock untuk kawasan member apabila trusted device unlock diaktifkan.

## Checklist
- [ ] Semak titik integrasi terbaik untuk setup thumbprint selepas login TAC
- [ ] Sediakan servis WebAuthn untuk daftar dan sahkan biometric pada device semasa
- [ ] Tambah prompt setup thumbprint selepas login TAC pertama
- [ ] Tambah unlock flow pada kawasan member untuk sesi trusted device
- [ ] Pastikan fallback TAC kekal tersedia jika biometric tidak disokong atau gagal
- [ ] Jalankan semakan ralat selepas pelaksanaan

## Acceptance
Selepas login TAC berjaya, pengguna boleh aktifkan thumbprint pada device semasa.
Bila buka semula app pada device yang sama dengan sesi masih tersimpan, pengguna boleh masuk semula menggunakan thumbprint tanpa minta TAC dahulu.
Jika biometric gagal atau tidak disokong, flow TAC sedia ada masih boleh digunakan.