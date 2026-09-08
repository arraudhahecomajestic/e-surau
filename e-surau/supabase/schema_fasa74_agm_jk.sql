-- e-Surau · Fasa 74 — Senarai Jawatankuasa & Laporan Biro (untuk Buku Laporan AGM)

create table if not exists agm_jk (
  id       uuid primary key default gen_random_uuid(),
  agm_id   uuid references agm(id) on delete cascade,
  kumpulan text not null default 'induk',  -- penaung|induk|ketua_biro|ajk_biasa|juruaudit|staf
  jawatan  text not null,
  nama     text not null,
  biro     text,
  catatan  text,
  susunan  int  not null default 100,
  dicipta  timestamptz default now()
);
create index if not exists agm_jk_agm on agm_jk (agm_id);

create table if not exists agm_biro (
  id       uuid primary key default gen_random_uuid(),
  agm_id   uuid references agm(id) on delete cascade,
  nama     text not null,
  ketua    text,
  laporan  text,
  susunan  int  not null default 100,
  dicipta  timestamptz default now()
);
create index if not exists agm_biro_agm on agm_biro (agm_id);

alter table agm_jk   enable row level security;
alter table agm_biro enable row level security;
-- Akses melalui service-role (admin) sahaja buat masa ini.
