-- =====================================================================
-- e-Surau · Tambah medan Setiausaha & Ahli pada agm_biro + seed 9 biro
-- Selamat run berulang (guard ikut nama biro — tak gandakan).
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
  ),
  (
    'Biro Multimedia dan Perhubungan Awam',
    'Mohammed Salihin bin Ali',
    null,
    null,
    5
  ),
  (
    'Biro Kebajikan, Khairat Kematian & Kemasyarakatan',
    'Bendahari',
    'Penolong Bendahari',
    null,
    6
  ),
  (
    'Biro Pengurusan Jenazah dan Tanah Kubur',
    'Mohamad Syahmi bin Seliman',
    null,
    E'Ummi Kalsom binti Rahmat\nZai\nFadzli',
    7
  ),
  (
    'Biro Penyelenggaraan dan Pembangunan',
    'Syarwani bin Mat Daud',
    null,
    E'Mohamad Syahmi bin Seliman',
    8
  ),
  (
    'Biro Hospitaliti dan Keselamatan',
    'Siak 1 (Mohd Azrun bin Abd. Rahman)',
    'Siak 2 (Syed Wahiyuddin bin Syed Mustaman)',
    null,
    9
  )
) as v(nama, ketua, setiausaha, ahli, susunan)
where not exists (
  select 1 from agm_biro b where b.agm_id = a.id and b.nama = v.nama
);

-- Semak:
-- select susunan, nama, ketua, setiausaha, ahli from agm_biro order by susunan;
