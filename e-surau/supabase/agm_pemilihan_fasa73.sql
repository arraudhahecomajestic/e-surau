-- ============================================================
-- e-Surau · Fasa 73 (Pemilihan AJK) — VERSI PENUH
-- PENTING: membuang jadual agm_calon versi ringkas terdahulu
-- (agm_pemilihan.sql) supaya skema penuh ini betul-betul terpasang.
-- Data calon ringkas (jika ada) akan hilang — ia hanya ujian.
-- ============================================================

-- 0) BUANG VERSI LAMA (ringkas) supaya tidak dilangkau oleh "if not exists"
drop table if exists agm_undian_calon cascade;
drop table if exists agm_undian cascade;
drop table if exists agm_calon cascade;
drop type  if exists status_calon  cascade;
drop type  if exists status_undian cascade;

-- ------------------------------------------------------------
-- 1. JAWATAN YANG DIPERTANDINGKAN
-- ------------------------------------------------------------
create table if not exists agm_jawatan (
  id           uuid primary key default gen_random_uuid(),
  agm_id       uuid not null references agm(id) on delete cascade,
  kod          text not null,
  nama         text not null,
  kategori     text not null default 'induk',
  bil_dipilih  int  not null default 1,
  susunan      int  not null default 100,
  catatan      text,
  dicipta      timestamptz not null default now(),
  unique (agm_id, kod)
);
create index if not exists idx_agm_jawatan_agm on agm_jawatan (agm_id, susunan);
alter table agm_jawatan enable row level security;

-- ------------------------------------------------------------
-- 2. PENCALONAN (AGM-2)
-- ------------------------------------------------------------
do $$ begin
  create type status_calon as enum ('menunggu', 'sah', 'tolak', 'tarik_diri', 'menang_tanpa_bertanding');
exception when duplicate_object then null; end $$;

create table if not exists agm_calon (
  id                 uuid primary key default gen_random_uuid(),
  agm_id             uuid not null references agm(id) on delete cascade,
  jawatan_id         uuid not null references agm_jawatan(id) on delete cascade,
  no_pencalonan      text unique,
  ahli_id            uuid references ahli_kariah(id) on delete set null,
  nama               text not null,
  no_ahli            text,
  telefon            text,
  fasa               text,
  pekerjaan          text,
  pengalaman         text,
  pencadang_ahli_id  uuid references ahli_kariah(id) on delete set null,
  pencadang_nama     text not null,
  pencadang_no_ahli  text,
  pencadang_telefon  text,
  penyokong_ahli_id  uuid references ahli_kariah(id) on delete set null,
  penyokong_nama     text not null,
  penyokong_no_ahli  text,
  penyokong_telefon  text,
  status             status_calon not null default 'menunggu',
  sebab_tolak        text,
  disemak_oleh       text,
  disemak_pada       timestamptz,
  jumlah_undi        int not null default 0,
  menang             boolean not null default false,
  catatan            text,
  tarikh_terima      date not null default current_date,
  dicipta            timestamptz not null default now()
);
create index if not exists idx_agm_calon_agm     on agm_calon (agm_id);
create index if not exists idx_agm_calon_jawatan on agm_calon (jawatan_id);
create unique index if not exists uq_agm_calon_ahli_jawatan
  on agm_calon (jawatan_id, ahli_id) where ahli_id is not null;

create sequence if not exists seq_no_pencalonan start 1;
create or replace function set_no_pencalonan() returns trigger as $$
begin
  if new.no_pencalonan is null then
    new.no_pencalonan := 'SAR-CALON-' || to_char(current_date, 'YYYY') || '-'
                         || lpad(nextval('seq_no_pencalonan')::text, 4, '0');
  end if;
  return new;
end; $$ language plpgsql;
drop trigger if exists trg_no_pencalonan on agm_calon;
create trigger trg_no_pencalonan
  before insert on agm_calon
  for each row execute function set_no_pencalonan();
alter table agm_calon enable row level security;

-- ------------------------------------------------------------
-- 3. PUSINGAN UNDIAN & KIRAAN (AGM-3 / AGM-5)
-- ------------------------------------------------------------
do $$ begin
  create type status_undian as enum ('belum', 'dibuka', 'dikira', 'disahkan');
exception when duplicate_object then null; end $$;

create table if not exists agm_undian (
  id                  uuid primary key default gen_random_uuid(),
  agm_id              uuid not null references agm(id) on delete cascade,
  jawatan_id          uuid not null references agm_jawatan(id) on delete cascade,
  pusingan            int  not null default 1,
  undi_dikeluarkan    int  not null default 0,
  undi_dikembalikan   int  not null default 0,
  undi_rosak          int  not null default 0,
  undi_sah            int  generated always as (undi_dikembalikan - undi_rosak) stored,
  kaedah              text not null default 'kertas',
  status              status_undian not null default 'belum',
  masa_mula           timestamptz,
  masa_tamat          timestamptz,
  petugas_1           text,
  petugas_2           text,
  disahkan_oleh       text,
  disahkan_pada       timestamptz,
  catatan             text,
  dicipta             timestamptz not null default now(),
  unique (jawatan_id, pusingan)
);
create index if not exists idx_agm_undian_agm on agm_undian (agm_id);
alter table agm_undian enable row level security;

create table if not exists agm_undian_calon (
  id          uuid primary key default gen_random_uuid(),
  undian_id   uuid not null references agm_undian(id) on delete cascade,
  calon_id    uuid not null references agm_calon(id) on delete cascade,
  jumlah_undi int not null default 0 check (jumlah_undi >= 0),
  unique (undian_id, calon_id)
);
create index if not exists idx_agm_undian_calon on agm_undian_calon (undian_id);
alter table agm_undian_calon enable row level security;

-- ------------------------------------------------------------
-- 4. SEMAKAN KIRAAN
-- ------------------------------------------------------------
create or replace view v_agm_semakan_undi as
select
  u.id as undian_id, u.agm_id, j.nama as jawatan, u.pusingan,
  u.undi_dikeluarkan, u.undi_dikembalikan, u.undi_rosak, u.undi_sah,
  coalesce(sum(uc.jumlah_undi), 0)              as jumlah_undi_calon,
  u.undi_sah - coalesce(sum(uc.jumlah_undi), 0) as beza,
  (u.undi_sah = coalesce(sum(uc.jumlah_undi), 0)) as seimbang,
  (u.undi_dikembalikan > u.undi_dikeluarkan)      as amaran_lebih_kembali
from agm_undian u
join agm_jawatan j on j.id = u.jawatan_id
left join agm_undian_calon uc on uc.undian_id = u.id
group by u.id, u.agm_id, j.nama, u.pusingan,
         u.undi_dikeluarkan, u.undi_dikembalikan, u.undi_rosak, u.undi_sah;

-- ------------------------------------------------------------
-- 5. KEPUTUSAN PEMILIHAN
-- ------------------------------------------------------------
create or replace view v_agm_keputusan as
select
  c.agm_id, j.susunan, j.kategori, j.nama as jawatan, j.bil_dipilih,
  c.id as calon_id, c.nama as calon, c.no_ahli, c.status, c.jumlah_undi, c.menang,
  rank() over (partition by c.jawatan_id order by c.jumlah_undi desc) as kedudukan,
  count(*) filter (where c.status in ('sah', 'menang_tanpa_bertanding'))
    over (partition by c.jawatan_id) as bil_calon_sah
from agm_calon c
join agm_jawatan j on j.id = c.jawatan_id
where c.status <> 'tolak'
order by j.susunan, c.jumlah_undi desc;

-- ------------------------------------------------------------
-- 6. TENTUKAN PEMENANG BAGI SATU JAWATAN
-- ------------------------------------------------------------
create or replace function agm_tentukan_pemenang(p_jawatan_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_bil int; v_calon int; v_had int; v_seri int;
begin
  select bil_dipilih into v_bil from agm_jawatan where id = p_jawatan_id;
  if v_bil is null then return 'jawatan tidak dijumpai'; end if;
  select count(*) into v_calon from agm_calon
   where jawatan_id = p_jawatan_id and status in ('sah', 'menang_tanpa_bertanding');
  if v_calon = 0 then return 'tiada calon'; end if;
  if v_calon <= v_bil then
    update agm_calon set menang = true, status = 'menang_tanpa_bertanding'
     where jawatan_id = p_jawatan_id and status in ('sah', 'menang_tanpa_bertanding');
    return 'menang tanpa bertanding';
  end if;
  select jumlah_undi into v_had from agm_calon
   where jawatan_id = p_jawatan_id and status = 'sah'
   order by jumlah_undi desc offset (v_bil - 1) limit 1;
  select count(*) into v_seri from agm_calon
   where jawatan_id = p_jawatan_id and status = 'sah' and jumlah_undi = v_had;
  if v_seri > 1 and (
       select count(*) from agm_calon
        where jawatan_id = p_jawatan_id and status = 'sah' and jumlah_undi > v_had
     ) + v_seri > v_bil
  then
    update agm_calon set menang = false where jawatan_id = p_jawatan_id;
    return 'seri — perlu undi ulang';
  end if;
  update agm_calon set menang = (jumlah_undi >= v_had)
   where jawatan_id = p_jawatan_id and status = 'sah';
  return 'selesai';
end; $$;

-- ------------------------------------------------------------
-- 7. SALIN UNDI DARI PUSINGAN KE REKOD CALON
-- ------------------------------------------------------------
create or replace function agm_salin_undi(p_undian_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update agm_calon c set jumlah_undi = uc.jumlah_undi
    from agm_undian_calon uc
   where uc.undian_id = p_undian_id and uc.calon_id = c.id;
end; $$;

-- ------------------------------------------------------------
-- 8. PAPARAN AWAM — SENARAI CALON
-- ------------------------------------------------------------
create or replace view v_agm_calon_awam as
select c.agm_id, j.susunan, j.nama as jawatan, j.bil_dipilih,
  c.nama as calon, c.no_ahli, c.fasa, c.pencadang_nama, c.penyokong_nama, c.status
from agm_calon c
join agm_jawatan j on j.id = c.jawatan_id
where c.status in ('sah', 'menang_tanpa_bertanding')
order by j.susunan, c.nama;
grant select on v_agm_calon_awam to anon, authenticated;

-- ------------------------------------------------------------
-- 9. SUIS SISTEM
-- ------------------------------------------------------------
insert into tetapan_sistem (kunci, nilai) values
  ('agm_pencalonan_dibuka', 'false'),
  ('agm_penggal',           '2027–2032'),
  ('agm_keputusan_diterbit','false')
on conflict (kunci) do nothing;

-- ------------------------------------------------------------
-- 10. SEED JAWATAN BAGI AGM TERKINI
-- ------------------------------------------------------------
do $$
declare v_agm uuid;
begin
  select id into v_agm from agm order by tarikh desc nulls last limit 1;
  if v_agm is null then
    raise notice 'Tiada rekod dalam jadual agm — seed jawatan dilangkau.';
    return;
  end if;
  insert into agm_jawatan (agm_id, kod, nama, kategori, bil_dipilih, susunan) values
    (v_agm, 'PENGERUSI',        'Pengerusi',                                  'induk', 1, 10),
    (v_agm, 'TIM_PENGERUSI',    'Timbalan Pengerusi',                         'induk', 1, 20),
    (v_agm, 'SETIAUSAHA',       'Setiausaha',                                 'induk', 1, 30),
    (v_agm, 'PEN_SETIAUSAHA',   'Penolong Setiausaha',                        'induk', 1, 40),
    (v_agm, 'BENDAHARI',        'Bendahari',                                  'induk', 1, 50),
    (v_agm, 'PEN_BENDAHARI',    'Penolong Bendahari',                         'induk', 1, 60),
    (v_agm, 'BIRO_DAKWAH',      'Ketua Biro Pendidikan & Dakwah',             'biro',  1, 70),
    (v_agm, 'BIRO_BANGUNAN',    'Ketua Biro Pembangunan & Penyelenggaraan',   'biro',  1, 80),
    (v_agm, 'BIRO_KEBAJIKAN',   'Ketua Biro Kebajikan & Khairat Kematian',    'biro',  1, 90),
    (v_agm, 'BIRO_MUSLIMAT',    'Ketua Biro Muslimat',                        'biro',  1, 100),
    (v_agm, 'BIRO_BELIA',       'Ketua Biro Belia & Remaja',                  'biro',  1, 110),
    (v_agm, 'BIRO_MEDIA',       'Ketua Biro Media, Teknologi & Penajaan',     'biro',  1, 120),
    (v_agm, 'AJK_BIASA',        'Ahli Jawatankuasa Biasa',                    'ajk',   6, 130),
    (v_agm, 'JURUAUDIT',        'Juruaudit Dalaman',                          'audit', 2, 140)
  on conflict (agm_id, kod) do nothing;
end $$;
