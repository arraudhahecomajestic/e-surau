-- ============================================================
-- Fasa 87 — Gambar Laporan Biro (4–10 gambar setiap biro)
-- Ketua biro muat naik gambar aktiviti melalui pautan biro.
-- Selamat run berulang.
-- ============================================================
create table if not exists agm_biro_gambar (
  id       uuid primary key default gen_random_uuid(),
  biro_id  uuid not null references agm_biro(id) on delete cascade,
  url      text not null,
  path     text,
  susunan  int  not null default 0,
  dicipta  timestamptz not null default now()
);
create index if not exists idx_agm_biro_gambar_biro on agm_biro_gambar (biro_id, susunan);
alter table agm_biro_gambar enable row level security;
