-- ============================================================
-- Fasa 88 — Modul Bantuan Kecemasan / Tabung Ihsan
-- Sumber dana : Infaq + Sedekah/Tabung Ihsan  (BUKAN zakat)
-- Pemohon     : ahli kariah berdaftar sahaja
-- Pengurus    : peranan 'biro_kebajikan' (Bendahari bayar, Admin override)
-- Ketelusan   : agregat tanpa nama (maruah penerima dijaga)
-- Dokumen     : guna bucket sedia ada 'salinan-kp' (signed URL)
-- Selamat run berulang.
-- ============================================================

-- 0) Peranan baharu 'biro_kebajikan' (jalankan berasingan; enum tak boleh
--    dalam transaksi yang sama dengan penggunaannya).
alter type peranan_jenis add value if not exists 'biro_kebajikan';

-- 1) PERMOHONAN BANTUAN -------------------------------------------------
create table if not exists bantuan_permohonan (
  id                uuid primary key default gen_random_uuid(),
  no_rujukan        text unique,                    -- auto: BKC-YYYY-####
  ahli_id           uuid references ahli_kariah(id) on delete set null,
  profil_id         uuid references profil(id) on delete set null,
  nama              text,                           -- snapshot pemohon
  no_kp             text,
  telefon           text,

  jenis             text not null,                  -- tunai|minyak|sewa|makanan|perubatan|bil|lain
  jenis_lain        text,
  jumlah_dimohon    numeric(10,2),
  sebab             text not null,
  keutamaan         text default 'biasa',           -- biasa|segera
  nama_bank         text,
  no_akaun_bank     text,

  status            text not null default 'baru',   -- baru|semakan|lulus|tolak|bayar|selesai

  -- semakan / kelulusan (Biro Kebajikan)
  jumlah_lulus      numeric(10,2),
  sumber_dana       text,                           -- infaq|tabung_ihsan
  catatan_biro      text,
  diproses_oleh     uuid references profil(id),
  diproses_nama     text,
  tarikh_tindakan   timestamptz,

  -- pembayaran (Bendahari)
  kaedah_bayar      text,                           -- tunai|pindahan
  bukti_bayar_url   text,                           -- path dalam bucket 'salinan-kp'
  tarikh_bayar      timestamptz,
  dibayar_oleh      uuid references profil(id),
  dibayar_nama      text,
  pengesahan_terima boolean default false,

  dicipta           timestamptz not null default now(),
  dikemaskini       timestamptz not null default now()
);
create index if not exists idx_bantuan_ahli    on bantuan_permohonan(ahli_id);
create index if not exists idx_bantuan_profil  on bantuan_permohonan(profil_id);
create index if not exists idx_bantuan_status  on bantuan_permohonan(status);
create index if not exists idx_bantuan_dicipta on bantuan_permohonan(dicipta);

-- 2) DOKUMEN SOKONGAN (banyak per permohonan) --------------------------
create table if not exists bantuan_dokumen (
  id             uuid primary key default gen_random_uuid(),
  permohonan_id  uuid not null references bantuan_permohonan(id) on delete cascade,
  url            text not null,                     -- path dalam bucket 'salinan-kp'
  label          text,
  dicipta        timestamptz not null default now()
);
create index if not exists idx_bantuan_dok on bantuan_dokumen(permohonan_id);

-- 3) LEDGER TABUNG BANTUAN (masuk/keluar) — baki & ketelusan -----------
create table if not exists bantuan_tabung (
  id             uuid primary key default gen_random_uuid(),
  arah           text not null,                     -- masuk|keluar
  jumlah         numeric(10,2) not null check (jumlah >= 0),
  sumber         text,                              -- masuk: infaq|tabung_ihsan|derma|lain
  permohonan_id  uuid references bantuan_permohonan(id) on delete set null,
  keterangan     text,
  tarikh         date not null default current_date,
  dicipta_oleh   uuid references profil(id),
  dicipta_nama   text,
  dicipta        timestamptz not null default now()
);
create index if not exists idx_tabung_arah on bantuan_tabung(arah);

-- 4) AUTO NO. RUJUKAN  BKC-YYYY-#### -----------------------------------
create or replace function set_bantuan_no_rujukan() returns trigger as $$
declare
  thn text := to_char(now(),'YYYY');
  seq int;
begin
  if new.no_rujukan is null then
    select count(*) + 1 into seq
      from bantuan_permohonan
      where to_char(dicipta,'YYYY') = thn;
    new.no_rujukan := 'BKC-' || thn || '-' || lpad(seq::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_bantuan_no_rujukan on bantuan_permohonan;
create trigger trg_bantuan_no_rujukan
  before insert on bantuan_permohonan
  for each row execute function set_bantuan_no_rujukan();

create or replace function touch_bantuan() returns trigger as $$
begin new.dikemaskini := now(); return new; end;
$$ language plpgsql;
drop trigger if exists trg_touch_bantuan on bantuan_permohonan;
create trigger trg_touch_bantuan
  before update on bantuan_permohonan
  for each row execute function touch_bantuan();

-- 5) RLS: tutup capaian terus — semua melalui server (service role) -----
alter table bantuan_permohonan enable row level security;
alter table bantuan_dokumen    enable row level security;
alter table bantuan_tabung     enable row level security;
-- (sengaja tiada policy: server guna service role yang memintas RLS,
--  sama corak modul lain. Dokumen guna bucket 'salinan-kp' sedia ada.)

-- NOTA: Lantik Biro Kebajikan di /admin/peranan (jawatan "Biro Kebajikan"),
--       atau:  update profil set peranan='biro_kebajikan' where emel='...';
