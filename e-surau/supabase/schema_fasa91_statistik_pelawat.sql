-- Fasa 91: Kaunter jumlah pelawat portal (laman utama)
-- Jalankan sekali dalam Supabase SQL Editor.

create table if not exists statistik_pelawat (
  id int primary key default 1,
  jumlah bigint not null default 0,
  dikemaskini timestamptz not null default now(),
  constraint statistik_pelawat_satu_baris check (id = 1)
);

insert into statistik_pelawat (id, jumlah)
values (1, 0)
on conflict (id) do nothing;

-- Tambah 1 secara atomik (elak race condition) & pulangkan jumlah terkini.
create or replace function tambah_pelawat()
returns bigint
language sql
security definer
set search_path = public
as $$
  update statistik_pelawat
     set jumlah = jumlah + 1, dikemaskini = now()
   where id = 1
  returning jumlah;
$$;
