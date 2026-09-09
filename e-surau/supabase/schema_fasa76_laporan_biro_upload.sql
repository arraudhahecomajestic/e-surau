-- ============================================================
-- e-Surau · Skema Fasa 76 (Muat Naik Laporan Biro — pautan sendiri)
-- Jalankan di Supabase SQL Editor (selepas fasa 74 agm_jk).
-- Selamat run berulang.
-- ============================================================

-- Kod unik setiap biro untuk pautan muat naik awam:  /laporan-biro/<kod>
alter table agm_biro add column if not exists kod       text;
-- Fail laporan (Word/PDF) yang dimuat naik oleh ketua biro.
alter table agm_biro add column if not exists fail_url  text;
alter table agm_biro add column if not exists fail_nama text;
alter table agm_biro add column if not exists fail_masa timestamptz;

-- Jana kod untuk biro sedia ada yang belum ada kod.
update agm_biro
set kod = substr(md5(random()::text || id::text), 1, 10)
where kod is null;

create unique index if not exists agm_biro_kod_unik on agm_biro (kod) where kod is not null;

-- Nota: fail dimuat naik ke baldi awam "kandungan" (path: laporan-biro/<kod>-<ts>.<ext>)
-- melalui server action guna service-role (ketua biro tidak perlu log masuk).
-- Semak:
-- select nama, kod, fail_nama, fail_masa from agm_biro order by susunan;
