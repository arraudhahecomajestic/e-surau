-- ============================================================
-- e-Surau · Fasa 78 — Usul / Cadangan Kariah (borang awam)
-- Kariah hantar usul sendiri melalui pautan (isi IC, maklumat auto).
-- Jalankan di Supabase SQL Editor (selepas fasa 72 AGM).
-- Selamat run berulang.
-- ============================================================

create table if not exists agm_usul_kariah (
  id          uuid primary key default gen_random_uuid(),
  agm_id      uuid references agm(id) on delete cascade,
  ahli_id     uuid,          -- rujuk ahli_kariah (null jika IC tak dijumpai)
  no_kp       text,
  nama        text not null,
  no_tel      text,
  usul        text not null,
  penjelasan  text,
  status      text not null default 'baru',   -- baru | diterima | ditolak
  dicipta     timestamptz default now()
);
create index if not exists agm_usul_kariah_agm on agm_usul_kariah (agm_id);

alter table agm_usul_kariah enable row level security;
-- Tiada polisi awam: semua baca/tulis melalui server action (service-role).

-- Semak:
-- select nama, no_tel, usul, status, dicipta from agm_usul_kariah order by dicipta desc;
