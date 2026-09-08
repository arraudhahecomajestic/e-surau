-- e-Surau · Fasa 72 — Mesyuarat Agung Kariah (AGM)
-- Modul admin/AJK: maklumat AGM, daftar hadir & senarai pengundi, usul & undian.

create table if not exists agm (
  id         uuid primary key default gen_random_uuid(),
  tajuk      text not null default 'Mesyuarat Agung Kariah',
  tahun      int  not null,
  tarikh     date,
  masa       text,
  tempat     text,
  kuorum     int  not null default 0,
  atur_cara  text,
  status     text not null default 'akan_datang', -- akan_datang | sedang | selesai
  dicipta    timestamptz default now()
);

-- Daftar kehadiran / senarai pengundi (satu baris satu hadirin).
create table if not exists agm_hadir (
  id          uuid primary key default gen_random_uuid(),
  agm_id      uuid references agm(id) on delete cascade,
  ahli_id     uuid,          -- rujuk ahli_kariah (null utk walk-in)
  nama        text not null,
  no_ahli     text,
  hadir       boolean not null default true,
  masa_daftar timestamptz default now()
);
create unique index if not exists agm_hadir_unik on agm_hadir (agm_id, ahli_id) where ahli_id is not null;
create index if not exists agm_hadir_agm on agm_hadir (agm_id);

-- Usul & undian.
create table if not exists agm_usul (
  id               uuid primary key default gen_random_uuid(),
  agm_id           uuid references agm(id) on delete cascade,
  no               int  not null default 1,
  tajuk            text not null,
  keterangan       text,
  undi_setuju      int  not null default 0,
  undi_tolak       int  not null default 0,
  undi_berkecuali  int  not null default 0,
  keputusan        text,            -- lulus | tolak | tangguh | (null)
  catatan          text,
  dicipta          timestamptz default now()
);
create index if not exists agm_usul_agm on agm_usul (agm_id);

alter table agm        enable row level security;
alter table agm_hadir  enable row level security;
alter table agm_usul   enable row level security;
-- Nota: akses melalui service-role (admin) sahaja buat masa ini; tiada polisi awam.
