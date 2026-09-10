-- ============================================================
-- Fasa 79 — Gerak Kerja AGM (senarai semak persiapan)
-- Untuk kegunaan AJK sahaja, di dalam ruang AGM.
-- Idempotent — selamat dijalankan semula.
-- ============================================================

create table if not exists agm_gerak_kerja (
  id             uuid primary key default gen_random_uuid(),
  agm_id         uuid not null references agm(id) on delete cascade,
  fasa           text not null,               -- A / B / C / D / E
  fasa_nama      text not null,
  kod            text not null,               -- a1, a2, ...
  tugasan        text not null,
  unit           text,                        -- teks bebas: Setiausaha, Bendahari, Unit Publisiti, ...
  tarikh_sasaran date,
  nota           text,
  susunan        int  not null default 0,
  selesai        boolean not null default false,
  selesai_oleh   text,
  selesai_pada   timestamptz,
  catatan        text,
  dicipta        timestamptz not null default now(),
  unique (agm_id, kod)
);

create index if not exists idx_gk_agm    on agm_gerak_kerja (agm_id);
create index if not exists idx_gk_fasa   on agm_gerak_kerja (agm_id, fasa, susunan);

alter table agm_gerak_kerja enable row level security;
-- Tiada polisi awam — akses hanya melalui service-role (server) e-Surau.

-- Trigger: tetapkan/kosongkan selesai_pada bila status berubah.
create or replace function set_gk_selesai_pada() returns trigger as $$
begin
  if new.selesai and (old.selesai is distinct from new.selesai) then
    new.selesai_pada := now();
  elsif not new.selesai then
    new.selesai_pada := null;
    new.selesai_oleh := null;
  end if;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_gk_selesai on agm_gerak_kerja;
create trigger trg_gk_selesai before update on agm_gerak_kerja
  for each row execute function set_gk_selesai_pada();

-- View utama: tambah status & baki hari.
create or replace view v_agm_gerak_kerja as
select
  g.*,
  case
    when g.selesai then 'selesai'
    when g.tarikh_sasaran is null then 'belum'
    when g.tarikh_sasaran <  current_date then 'lewat'
    when g.tarikh_sasaran =  current_date then 'hari_ini'
    else 'belum'
  end as status,
  case when g.tarikh_sasaran is null then null
       else (g.tarikh_sasaran - current_date) end as baki_hari
from agm_gerak_kerja g;

-- View ringkasan per-fasa.
create or replace view v_agm_gerak_kerja_fasa as
select
  agm_id, fasa, fasa_nama,
  count(*)                                   as jumlah,
  count(*) filter (where selesai)            as selesai,
  round(100.0 * count(*) filter (where selesai) / nullif(count(*),0)) as peratus
from agm_gerak_kerja
group by agm_id, fasa, fasa_nama;

-- View ringkasan keseluruhan.
create or replace view v_agm_gerak_kerja_ringkasan as
select
  agm_id,
  count(*)                        as jumlah,
  count(*) filter (where selesai) as selesai,
  count(*) filter (where not selesai and tarikh_sasaran < current_date) as lewat,
  round(100.0 * count(*) filter (where selesai) / nullif(count(*),0))   as peratus
from agm_gerak_kerja
group by agm_id;

-- ============================================================
-- Seed 49 tugasan untuk AGM terkini (jika belum ada).
-- ============================================================
do $$
declare v_agm uuid;
begin
  select id into v_agm from agm order by tahun desc, dicipta desc limit 1;
  if v_agm is null then return; end if;

  insert into agm_gerak_kerja (agm_id, fasa, fasa_nama, kod, tugasan, unit, tarikh_sasaran, nota, susunan, selesai) values
  -- A. Dokumen & Kelulusan
  (v_agm,'A','Dokumen & Kelulusan','a1','Kertas kerja AGM diluluskan Mesyuarat Persediaan AJK','Jawatankuasa','2026-09-09',null,1,true),
  (v_agm,'A','Dokumen & Kelulusan','a2','Slaid pembentangan kertas kerja dimuktamadkan','Setiausaha','2026-09-09',null,2,true),
  (v_agm,'A','Dokumen & Kelulusan','a3','Notis mesyuarat diedar kepada semua ahli kariah','Unit Publisiti','2026-09-10',null,3,false),
  (v_agm,'A','Dokumen & Kelulusan','a4','Hebahan usul + pautan diedar dalam WhatsApp kariah','Unit Publisiti','2026-09-10',null,4,false),
  (v_agm,'A','Dokumen & Kelulusan','a5','Laporan biro dikumpul daripada 6 biro','Semua Biro','2026-09-10','Pendidikan · Pembangunan · Kebajikan · Muslimat · Belia · Media',5,false),
  (v_agm,'A','Dokumen & Kelulusan','a6','Penyata Kewangan berakhir 31 Dis 2025 disiapkan','Bendahari','2026-09-10',null,6,false),
  (v_agm,'A','Dokumen & Kelulusan','a7','Laporan Juruaudit Dalaman disemak & ditandatangani','Juruaudit','2026-09-11',null,7,false),
  (v_agm,'A','Dokumen & Kelulusan','a8','Senarai nama JK dilengkapkan dalam Buku Laporan','Setiausaha','2026-09-11',null,8,false),
  (v_agm,'A','Dokumen & Kelulusan','a9','Tarikh tutup usul kariah — 5.00 petang','Setiausaha','2026-09-11',null,9,false),
  (v_agm,'A','Dokumen & Kelulusan','a10','Buku Laporan Tahunan dicetak & dijilid','Setiausaha','2026-09-11',null,10,false),
  (v_agm,'A','Dokumen & Kelulusan','a11','Borang AGM-1 & AGM-5 dicetak','Unit Pendaftaran','2026-09-11',null,11,false),
  (v_agm,'A','Dokumen & Kelulusan','a12','Senarai ahli layak mengundi dijana dari e-Surau','Unit Pendaftaran','2026-09-11',null,12,false),
  -- B. Sistem e-Surau
  (v_agm,'B','Sistem e-Surau','b1','Halaman cadangan usul kariah dibuka','Setiausaha','2026-09-10',null,1,true),
  (v_agm,'B','Sistem e-Surau','b2','Tarikh tutup usul ditetapkan pada halaman usul','Setiausaha','2026-09-10',null,2,false),
  (v_agm,'B','Sistem e-Surau','b3','Setiap biro kemas kini unit masing-masing','Semua Biro','2026-09-10',null,3,false),
  (v_agm,'B','Sistem e-Surau','b4','Laporan Biro AJK 2026 dimasukkan ke e-Surau','Semua Biro','2026-09-10',null,4,false),
  (v_agm,'B','Sistem e-Surau','b5','Kempen kemas kini maklumat ahli — 489 ahli','Unit Pendaftaran','2026-09-11',null,5,false),
  (v_agm,'B','Sistem e-Surau','b6','Migrasi fasa73 (pemilihan AJK) disediakan','Setiausaha','2026-09-10',null,6,true),
  (v_agm,'B','Sistem e-Surau','b7','Migrasi fasa73 dijalankan di Supabase','Setiausaha','2026-09-11',null,7,false),
  (v_agm,'B','Sistem e-Surau','b8','Modul kiraan undi diuji sebelum majlis','Unit Pemilihan','2026-09-11',null,8,false),
  -- C. Jamuan, Logistik & Teknikal
  (v_agm,'C','Jamuan, Logistik & Teknikal','c1','Pembekal jamuan dipilih & disahkan','Unit Jamuan','2026-09-10','Dapur Rewang · Kak June · Cik Munge',1,false),
  (v_agm,'C','Jamuan, Logistik & Teknikal','c2','Menu dipilih — Menu 1, 2 atau 3','Unit Jamuan','2026-09-10',null,2,false),
  (v_agm,'C','Jamuan, Logistik & Teknikal','c3','Kambing golek + sup + syawarma disahkan','Unit Jamuan','2026-09-10',null,3,false),
  (v_agm,'C','Jamuan, Logistik & Teknikal','c4','Bilangan pax disahkan dengan pembekal','Unit Jamuan','2026-09-11',null,4,false),
  (v_agm,'C','Jamuan, Logistik & Teknikal','c5','Minum malam ditempah','Unit Jamuan','2026-09-11',null,5,false),
  (v_agm,'C','Jamuan, Logistik & Teknikal','c6','Khemah besar dipasang','Unit Logistik','2026-09-11',null,6,false),
  (v_agm,'C','Jamuan, Logistik & Teknikal','c7','Sewa 90 kerusi & meja disahkan','Unit Logistik','2026-09-11',null,7,false),
  (v_agm,'C','Jamuan, Logistik & Teknikal','c8','Ujian PA, mikrofon, projektor & skrin','Unit Teknikal','2026-09-11',null,8,false),
  (v_agm,'C','Jamuan, Logistik & Teknikal','c9','Talian internet diuji di lokasi khemah','Unit Teknikal','2026-09-11',null,9,false),
  (v_agm,'C','Jamuan, Logistik & Teknikal','c10','Salinan cetak pembentangan (sandaran)','Setiausaha','2026-09-11',null,10,false),
  (v_agm,'C','Jamuan, Logistik & Teknikal','c11','Papan tanda, pengumuman & parkir','Unit Keselamatan','2026-09-12',null,11,false),
  (v_agm,'C','Jamuan, Logistik & Teknikal','c12','Peti kecemasan disediakan','Unit Logistik','2026-09-12',null,12,false),
  -- D. Hari AGM
  (v_agm,'D','Hari AGM','d1','Susun atur khemah & kaunter (4pm)','Semua Unit','2026-09-12',null,1,false),
  (v_agm,'D','Hari AGM','d2','Kaunter pendaftaran dibuka (7mlm)','Unit Pendaftaran','2026-09-12',null,2,false),
  (v_agm,'D','Hari AGM','d3','Kuorum disemak & direkod (AGM-1)','Unit Pendaftaran','2026-09-12',null,3,false),
  (v_agm,'D','Hari AGM','d4','Pembentangan program/belanjawan/kewangan','Setiausaha','2026-09-12',null,4,false),
  (v_agm,'D','Hari AGM','d5','Usul kariah dibentang & diundi','Pengerusi','2026-09-12',null,5,false),
  (v_agm,'D','Hari AGM','d6','Perletakan jawatan & pembubaran JK','Pengerusi','2026-09-12',null,6,false),
  (v_agm,'D','Hari AGM','d7','Pemilihan AJK 2027–2031 (angkat tangan)','Unit Pemilihan','2026-09-12',null,7,false),
  (v_agm,'D','Hari AGM','d8','Kiraan undi direkod (e-Surau & AGM-5)','Unit Pemilihan','2026-09-12',null,8,false),
  (v_agm,'D','Hari AGM','d9','Keputusan pemilihan diumumkan','Unit Pemilihan','2026-09-12',null,9,false),
  -- E. Selepas AGM
  (v_agm,'E','Selepas AGM','e1','Draf minit dihantar kepada Pengerusi','Setiausaha','2026-09-15',null,1,false),
  (v_agm,'E','Selepas AGM','e2','Minit diluluskan diedar','Setiausaha','2026-09-19',null,2,false),
  (v_agm,'E','Selepas AGM','e3','Laporan pasca program & penyata penuh','Bendahari','2026-09-19',null,3,false),
  (v_agm,'E','Selepas AGM','e4','Senarai AJK baharu ke PAID Hulu Langat','Setiausaha','2026-09-26',null,4,false),
  (v_agm,'E','Selepas AGM','e5','Peranan e-Surau dikemas kini','Setiausaha','2026-09-26',null,5,false),
  (v_agm,'E','Selepas AGM','e6','Penandatangan akaun bank ditukar','Bendahari','2026-10-12',null,6,false),
  (v_agm,'E','Selepas AGM','e7','Mesyuarat JK pertama penggal baharu','Pengerusi','2026-10-12',null,7,false),
  (v_agm,'E','Selepas AGM','e8','Serah tugas rasmi, fail & aset','Setiausaha','2026-10-12',null,8,false)
  on conflict (agm_id, kod) do nothing;
end $$;
