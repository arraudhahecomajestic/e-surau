-- Fasa 96: Modul Jawatan Kosong (iklan + permohonan online).
create table if not exists jawatan_kosong (
  id uuid primary key default gen_random_uuid(),
  no_ruj text,
  jawatan text not null,
  gaji_julat text,
  waktu_bertugas text,
  tarikh_iklan date,
  tarikh_tutup date,
  tarikh_lapor date,
  keterangan text,            -- skop tugas, kelayakan, elaun (teks bebas)
  status text not null default 'aktif',
  pic_nama text, pic_telefon text, pic_emel text,
  dicipta_oleh text,
  dicipta timestamptz default now(),
  dikemaskini timestamptz
);

create table if not exists jawatan_permohonan (
  id uuid primary key default gen_random_uuid(),
  jawatan_id uuid not null references jawatan_kosong(id) on delete cascade,
  nama text not null,
  no_kp text,
  umur int,
  telefon text,
  emel text,
  pendidikan text,
  pengalaman text,
  url_resume text, nama_resume text,
  url_gambar text,
  status text not null default 'baru',  -- baru/saring/temuduga/berjaya/tolak
  catatan_admin text,
  dicipta timestamptz default now()
);
create index if not exists idx_jpermohonan_jid on jawatan_permohonan(jawatan_id);
