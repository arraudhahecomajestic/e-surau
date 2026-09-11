-- ============================================================
-- Fasa 84 — Borang Maklumat Diri Calon (BOR-BPM-01)
-- Tambah medan borang perakuan maklumat diri pada setiap calon.
-- Selamat run berulang (add column if not exists).
-- ============================================================
alter table agm_calon add column if not exists alamat               text;
alter table agm_calon add column if not exists umur                 text;
alter table agm_calon add column if not exists status_kahwin        text;    -- 'berkahwin' | 'bujang'
alter table agm_calon add column if not exists kelayakan_akademik   text;
alter table agm_calon add column if not exists ahli_berdaftar       boolean; -- Ya = true, Tidak = false
alter table agm_calon add column if not exists tinggal_dalam_kariah boolean;
alter table agm_calon add column if not exists pengalaman_tadbir    text;    -- 'ada' | 'tiada'
alter table agm_calon add column if not exists pengalaman_tempoh    text;    -- 'kurang_3' | 'lebih_3'
alter table agm_calon add column if not exists ada_penyakit         boolean; -- Ya = true, Tidak = false
alter table agm_calon add column if not exists penyakit_nyatakan    text;
alter table agm_calon add column if not exists borang_diisi         boolean not null default false;
alter table agm_calon add column if not exists tarikh_borang        date;
-- pekerjaan sudah wujud (agm_pemilihan_fasa73.sql).
