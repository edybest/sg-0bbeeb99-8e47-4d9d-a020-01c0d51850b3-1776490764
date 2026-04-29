---
title: Lane spin member RLS fix
status: in_progress
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
- [ ] Semak semula schema dan polisi semasa untuk `lane_spin_results` dan `lane_assignments`
- [ ] Tambah polisi insert untuk ahli simpan spin sendiri berdasarkan `members.user_id = auth.uid()`
- [ ] Tambah polisi insert/update untuk ahli simpan lane assignment sendiri atau couple mereka
- [ ] Minta pengguna test semula flow undi lane selepas perubahan