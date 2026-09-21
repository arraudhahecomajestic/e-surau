-- ============================================================
-- Fasa 89 — Bantuan Kecemasan: medan penilaian kewangan asas
-- Selaras Borang Permohonan Bantuan Khas SAR (versi ringkas).
-- Selamat run berulang.
-- ============================================================
alter table bantuan_permohonan add column if not exists pekerjaan          text;   -- bekerja|tidak_bekerja
alter table bantuan_permohonan add column if not exists jawatan            text;   -- jika bekerja
alter table bantuan_permohonan add column if not exists pendapatan_bulanan numeric(10,2);
alter table bantuan_permohonan add column if not exists perbelanjaan_bulanan numeric(10,2);
alter table bantuan_permohonan add column if not exists kesihatan          text;   -- sihat|sakit
alter table bantuan_permohonan add column if not exists kesihatan_nyatakan text;
alter table bantuan_permohonan add column if not exists bil_tanggungan     int;
