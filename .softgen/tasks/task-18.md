---
title: Lane spin member RLS fix
status: done
priority: urgent
type: bug
tags:
  - database
  - rls
  - lane
  - member
created_by: agent
created_at: 2026-04-29T08:58:39Z
position: 18
---

## Notes
Ralat "failed to save lane assignment" berlaku dalam flow undi lane member. Simpanan berlaku ke jadual `lane_spin_results` dan `lane_assignments`, tetapi polisi RLS semasa hanya membenarkan admin menulis. Perlu benarkan ahli yang log masuk menyimpan spin sendiri dan lane assignment sendiri, termasuk flow couple bila `couple_id` digunakan.

## Checklist
- [x] Semak semula schema dan polisi semasa untuk `lane_spin_results` dan `lane_assignments`
- [x] Tambah polisi insert untuk ahli simpan spin sendiri berdasarkan `members.user_id = auth.uid()`
- [x] Tambah polisi insert/update untuk ahli simpan lane assignment sendiri atau couple mereka
- [x] Minta pengguna test semula flow undi lane selepas perubahan

## Acceptance
✅ Members can save their own lane spin results
✅ Members can save lane assignments for themselves or their couple
✅ Screenshot UI hides "Telah Undi" / "Belum Undi" text labels