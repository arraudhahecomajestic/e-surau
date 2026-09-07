-- ============================================================
-- e-Surau · Fasa 71 — Cabutan Bertuah (Lucky Draw) untuk program
--  Peserta diambil dari senarai RSVP / check-in program.
--  Pemenang direkod di sini (elak menang berulang).
--  Jalankan di Supabase SQL Editor.
-- ============================================================

create table if not exists cabutan_pemenang (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid references program(id) on delete cascade,
  rsvp_id     uuid,                 -- rujukan peserta (elak menang 2x)
  nama        text not null,
  telefon     text,
  hadiah      text,                 -- label hadiah (cth "Hadiah 1: Hamper")
  dicipta     timestamptz not null default now()
);

create index if not exists idx_cabutan_program on cabutan_pemenang(program_id);

alter table cabutan_pemenang enable row level security;
-- Akses hanya melalui server (service_role). Tiada polisi anon/authenticated.
