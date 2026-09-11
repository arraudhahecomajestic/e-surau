-- ============================================================
-- Fasa 85 — Fail Kewangan (PDF) untuk Laporan Kewangan AGM
-- Bendahari boleh muat naik penyata kewangan / laporan juruaudit
-- dalam bentuk PDF. Boleh lebih dari satu fail.
-- Selamat run berulang.
-- ============================================================
create table if not exists agm_fail_kewangan (
  id          uuid primary key default gen_random_uuid(),
  agm_id      uuid not null references agm(id) on delete cascade,
  tajuk       text not null,
  url         text not null,
  path        text,
  saiz        bigint,
  dimuat_oleh text,
  dicipta     timestamptz not null default now()
);
create index if not exists idx_agm_fail_kewangan_agm on agm_fail_kewangan (agm_id, dicipta);
alter table agm_fail_kewangan enable row level security;
