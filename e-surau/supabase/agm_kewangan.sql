-- e-Surau · Simpanan angka Penyata Kewangan Buku Laporan (dimuat naik Bendahari via CSV). Selamat run berulang.
create table if not exists agm_kewangan (
  id       uuid primary key default gen_random_uuid(),
  agm_id   uuid not null references agm(id) on delete cascade,
  bahagian text not null,               -- pendapatan | perbelanjaan | aset | liabiliti | tabung
  label    text not null,
  n1 numeric not null default 0,        -- pendapatan/belanja/aset/liabiliti: tahun semasa · tabung: baki 1 Jan
  n2 numeric not null default 0,        -- tahun lalu · tabung: terimaan
  n3 numeric not null default 0,        -- tabung: bayaran
  n4 numeric not null default 0,        -- tabung: baki 31 Dis
  susunan  int not null default 100,
  dicipta  timestamptz not null default now()
);
create index if not exists agm_kewangan_agm on agm_kewangan (agm_id, bahagian, susunan);
alter table agm_kewangan enable row level security;
