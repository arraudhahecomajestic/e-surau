-- Fasa 92: Pinjaman Staf — potongan ansuran auto-cadang dalam slip gaji.
-- Jalankan sekali dalam Supabase SQL Editor.

create table if not exists staf_pinjaman (
  id uuid primary key default gen_random_uuid(),
  profil_id uuid not null references profil(id) on delete cascade,
  jumlah numeric not null,            -- jumlah pinjaman (RM)
  ansuran numeric not null,           -- potongan sebulan (RM)
  bil_ansuran int not null,           -- bilangan bulan potongan
  mula_bulan text not null,           -- 'YYYY-MM' bulan potongan pertama
  catatan text,
  aktif boolean not null default true,
  dicipta timestamptz default now()
);

-- Seed: pinjaman Khairul RM1,000 — RM250/bulan x 4, mula November 2026.
insert into staf_pinjaman (profil_id, jumlah, ansuran, bil_ansuran, mula_bulan, catatan)
select '69eb1814-67b9-4b9e-9476-330c9a99bc59', 1000, 250, 4, '2026-11', 'Pinjaman staf — bayar balik 4 bulan (Nov 2026 - Feb 2027)'
where not exists (
  select 1 from staf_pinjaman
  where profil_id = '69eb1814-67b9-4b9e-9476-330c9a99bc59' and mula_bulan = '2026-11'
);
