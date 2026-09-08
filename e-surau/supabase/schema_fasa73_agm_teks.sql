-- e-Surau · Fasa 73 — Teks naratif Buku Laporan Tahunan AGM
-- Simpan bahagian naratif (kata aluan, pendahuluan, cabaran, dll) ikut AGM & kunci.

create table if not exists agm_laporan_teks (
  id       uuid primary key default gen_random_uuid(),
  agm_id   uuid references agm(id) on delete cascade,
  kunci    text not null,   -- cth: kata_aluan, su_pendahuluan, su_cabaran ...
  nilai    text,
  dikemas  timestamptz default now(),
  unique (agm_id, kunci)
);
create index if not exists agm_teks_agm on agm_laporan_teks (agm_id);
alter table agm_laporan_teks enable row level security;
-- Akses melalui service-role (admin) sahaja buat masa ini.
