-- =====================================================================
-- e-Surau · AGM QR Check-in (daftar hadir sendiri guna no. IC)
-- Selamat run berulang.
-- =====================================================================

-- 1) Kawalan pada rekod AGM
alter table agm add column if not exists daftar_buka boolean not null default false; -- buka/tutup daftar hadir
alter table agm add column if not exists kod text;                                    -- kod unik untuk URL QR

-- Jana kod unik untuk AGM sedia ada yang belum ada kod
update agm set kod = substr(md5(random()::text || id::text), 1, 10) where kod is null;
create unique index if not exists agm_kod_unik on agm (kod) where kod is not null;

-- 2) Medan tambahan pada rekod kehadiran
alter table agm_hadir add column if not exists no_kp text;                             -- IC yang di-scan
alter table agm_hadir add column if not exists kaedah text;                            -- 'sistem' | 'qr' | 'walk-in'
alter table agm_hadir add column if not exists perlu_semak boolean not null default false; -- benar = daftar 2025, belum kemas kini sistem

-- Elak IC yang sama daftar dua kali untuk AGM yang sama
create unique index if not exists agm_hadir_nokp_unik on agm_hadir (agm_id, no_kp) where no_kp is not null;

-- Semak:
-- select kod, daftar_buka from agm order by tahun desc;
-- select nama, no_kp, kaedah, perlu_semak from agm_hadir order by masa_daftar desc;
