---
title: Quick-access mobile navigation
status: done
priority: high
type: feature
tags:
- mobile
- navigation
- member
created_by: agent
created_at: 2026-04-26 15:25:12 UTC
position: 14
---

## Notes
Quick-access bar mobile dikekalkan dengan 5 menu utama dan butang "Lagi", tetapi visualnya kini ditukar kepada iOS-style floating dock. Dock baharu menggunakan permukaan putih lut sinar dengan blur, ikon dalam kapsul bulat lembut, bayang lebih ringan, dan label ringkas yang lebih mudah dibaca. Panel "Lagi" juga diselaraskan dengan radius lebih besar dan kad menu yang lebih selesa disentuh. Ruang bawah kandungan dalam `MemberLayout` turut ditambah supaya dock terapung tidak menutup kandungan terakhir pada halaman mobile.

## Checklist
- [x] Susun semula menu mobile kepada 5 quick-access item utama
- [x] Tambah butang "Lagi" untuk membuka senarai menu selebihnya
- [x] Kemaskan gaya visual supaya lebih ringkas dan mudah ditekan
- [x] Pastikan state aktif/current page masih jelas dipaparkan
- [x] Tukar bottom bar kepada iOS-style floating dock
- [x] Laraskan spacing bawah dan panel "Lagi" supaya sepadan dengan dock terapung
- [x] Jalankan semakan visual selepas pelaksanaan

## Acceptance
Pada paparan mobile, pengguna nampak quick-access bar terapung ala iOS dengan 5 menu utama dan butang "Lagi".
Menu selebihnya masih boleh diakses dengan mudah tanpa perlu scroll horizontal pada bottom bar.