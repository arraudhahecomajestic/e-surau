-- =====================================================================
-- e-Surau · SETUP LENGKAP MODUL AGM (satu kali run)
-- Cipta jadual + rekod AGM 2026 + seed 19 senarai JK sekaligus.
-- Selamat run berulang (if not exists + guard).
-- =====================================================================

-- 1) JADUAL AGM ------------------------------------------------------
create table if not exists agm (
  id uuid primary key default gen_random_uuid(),
  tajuk text not null default 'Mesyuarat Agung Kariah',
  tahun int not null,
  tarikh date, masa text, tempat text,
  kuorum int not null default 0,
  atur_cara text,
  status text not null default 'akan_datang',
  dicipta timestamptz default now()
);

create table if not exists agm_hadir (
  id uuid primary key default gen_random_uuid(),
  agm_id uuid references agm(id) on delete cascade,
  ahli_id uuid, nama text not null, no_ahli text,
  hadir boolean not null default true,
  masa_daftar timestamptz default now()
);
create unique index if not exists agm_hadir_unik on agm_hadir (agm_id, ahli_id) where ahli_id is not null;
create index if not exists agm_hadir_agm on agm_hadir (agm_id);

create table if not exists agm_usul (
  id uuid primary key default gen_random_uuid(),
  agm_id uuid references agm(id) on delete cascade,
  no int not null default 1,
  tajuk text not null, keterangan text,
  undi_setuju int not null default 0, undi_tolak int not null default 0, undi_berkecuali int not null default 0,
  keputusan text, catatan text,
  dicipta timestamptz default now()
);
create index if not exists agm_usul_agm on agm_usul (agm_id);

create table if not exists agm_jk (
  id uuid primary key default gen_random_uuid(),
  agm_id uuid references agm(id) on delete cascade,
  kumpulan text not null default 'induk',
  jawatan text not null, nama text not null, biro text, catatan text,
  susunan int not null default 100,
  dicipta timestamptz default now()
);
create index if not exists agm_jk_agm on agm_jk (agm_id);

create table if not exists agm_biro (
  id uuid primary key default gen_random_uuid(),
  agm_id uuid references agm(id) on delete cascade,
  nama text not null, ketua text, laporan text,
  susunan int not null default 100,
  dicipta timestamptz default now()
);
create index if not exists agm_biro_agm on agm_biro (agm_id);

create table if not exists agm_laporan_teks (
  id uuid primary key default gen_random_uuid(),
  agm_id uuid references agm(id) on delete cascade,
  kunci text not null, nilai text, dikemas timestamptz default now(),
  unique (agm_id, kunci)
);
create index if not exists agm_teks_agm on agm_laporan_teks (agm_id);

alter table agm enable row level security;
alter table agm_hadir enable row level security;
alter table agm_usul enable row level security;
alter table agm_jk enable row level security;
alter table agm_biro enable row level security;
alter table agm_laporan_teks enable row level security;

-- 2) CIPTA REKOD AGM 2026 (jika belum ada) --------------------------
insert into agm (tajuk, tahun, tarikh, tempat, kuorum, status)
select 'Mesyuarat Agung Kariah', 2026, '2026-09-12', 'Surau Ar-Raudhah, Eco Majestic', 0, 'akan_datang'
where not exists (select 1 from agm);

-- 3) SEED 19 SENARAI JK (ke AGM terkini, jika senarai masih kosong) --
with a as (select id from agm order by tahun desc, dicipta desc limit 1)
insert into agm_jk (agm_id, kumpulan, jawatan, nama, susunan)
select a.id, v.kumpulan, v.jawatan, v.nama, v.susunan
from a
cross join (values
  ('induk','Pengerusi','Mohd Thalji Bin Ahmad Bakery',1),
  ('induk','Timbalan Pengerusi','Mohammed Salihin Bin Ali',2),
  ('induk','Setiausaha','Mohamad Syahmi bin Seliman',3),
  ('induk','Bendahari','Muhammad Al Amin Bin Abdullah',4),
  ('induk','Penolong Bendahari','Mohd Farid Bin Ahmed',5),
  ('ajk_biasa','Ahli Jawatankuasa 1','Adnan Bin Abdullah',1),
  ('ajk_biasa','Ahli Jawatankuasa 2','Nurul Hidawati Binti Harun',2),
  ('ajk_biasa','Ahli Jawatankuasa 3','Mohamad Dzul Hilmi Bin Mohd Khalid',3),
  ('ajk_biasa','Wakil Pemuda','Muhammad Nabhan Bin Kamaludin',4),
  ('ajk_biasa','Wakil Muslimat','Nurul Fatin Amira Binti Sham Ali',5),
  ('juruaudit','Pemeriksa Kira-kira 1','Shahrudin Bin Tembol',1),
  ('juruaudit','Pemeriksa Kira-kira 2','Ridzuan Bin Ahmad Zaki',2),
  ('staf','Imam 1','Mohd Syamil Bin Mokhtar',1),
  ('staf','Imam 2','Noorhaffizul Bin Nor''azmy',2),
  ('staf','Bilal 1','Syarwani Bin Mat Daud',3),
  ('staf','Bilal 2','Mohamad Fareez Bin Laili',4),
  ('staf','Siak 1','Mohd Azrun Bin Abd.Rahman',5),
  ('staf','Siak 2','Syed Wahiyuddin Bin Syed Mustaman',6),
  ('staf','Pengurus Jenazah Muslimat','Ummi Kalsom Binti Rahmat',7)
) as v(kumpulan, jawatan, nama, susunan)
where not exists (select 1 from agm_jk j where j.agm_id = a.id);

-- Semak hasil:
-- select kumpulan, jawatan, nama from agm_jk order by kumpulan, susunan;
