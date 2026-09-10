-- ============================================================
-- Fasa 82 — Betulkan v_program_awam supaya tapis program terpadam
-- Bug: view (fasa13) dibuat sebelum ciri soft-delete (fasa69) wujud,
-- jadi program yang ditanda dibuang_pada MASIH muncul di homepage & chatbot.
-- Tambah syarat: p.dibuang_pada is null.
-- ============================================================
create or replace view v_program_awam as
select p.id, p.tajuk, p.keterangan, p.kategori, p.tarikh, p.masa, p.lokasi,
       p.had_peserta, p.rsvp_dibuka,
       (select coalesce(sum(r.bil_orang),0) from rsvp r where r.program_id = p.id) as jumlah_rsvp
from program p
where p.diterbitkan and p.tarikh >= current_date and p.dibuang_pada is null
order by p.tarikh asc;

grant select on v_program_awam to anon, authenticated;
