-- =====================================================================
-- e-Surau · Tambah medan Setiausaha & Ahli pada agm_biro + seed 4 biro
-- Selamat run berulang (guard ikut nama biro).
-- =====================================================================

-- 1) Tambah lajur (jika belum ada)
alter table agm_biro add column if not exists setiausaha text;
alter table agm_biro add column if not exists ahli text;   -- satu ahli setiap baris

-- 2) Seed biro (ke AGM terkini). Setiap biro diguard ikut nama.
with a as (select id from agm order by tahun desc, dicipta desc limit 1)
insert into agm_biro (agm_id, nama, ketua, setiausaha, ahli, susunan)
select a.id, v.nama, v.ketua, v.setiausaha, v.ahli, v.susunan
from a
cross join (values
  (
    'Biro Pengurusan, Pentadbiran dan Perancangan Strategik',
    'Pengerusi Surau Ar-Raudhah Eco Majestic',
    'Setiausaha Surau Ar-Raudhah Eco Majestic',
    E'Timbalan Pengerusi\nImam 1\nBilal 1\nSiak 1\nBendahari\nPenolong Bendahari',
    1
  ),
  (
    'Biro Dakwah & Pendidikan Kekeluargaan',
    'Imam 1',
    'Bilal 1',
    E'Imam 2\nBilal 2\nImam Rawatib\nBilal Rawatib',
    2
  ),
  (
    'Biro Pemuda, Sukan & Rekreasi',
    'Wakil Pemuda',
    null,
    null,
    3
  ),
  (
    'Biro Muslimat',
    'Wakil Muslimat',
    null,
    null,
    4
  )
) as v(nama, ketua, setiausaha, ahli, susunan)
where not exists (
  select 1 from agm_biro b where b.agm_id = a.id and b.nama = v.nama
);

-- Semak:
-- select susunan, nama, ketua, setiausaha, ahli from agm_biro order by susunan;
