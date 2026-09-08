-- e-Surau · Seed Senarai JK AGM 2026 (19 orang, dari Minit Bil. 3/2026)
-- SYARAT:
--   1) schema_fasa72_agm.sql + schema_fasa74_agm_jk.sql sudah dijalankan.
--   2) Rekod AGM sudah dicipta (Admin → AGM → Maklumat Mesyuarat).
-- Seed ini menyisip ke AGM TERKINI, dan hanya jika senarai JK masih kosong
-- (selamat dijalankan berulang — tidak akan gandakan).

with a as (
  select id from agm order by tahun desc, dicipta desc limit 1
)
insert into agm_jk (agm_id, kumpulan, jawatan, nama, susunan)
select a.id, v.kumpulan, v.jawatan, v.nama, v.susunan
from a
cross join (values
  -- Jawatankuasa Induk
  ('induk','Pengerusi','Mohd Thalji Bin Ahmad Bakery',1),
  ('induk','Timbalan Pengerusi','Mohammed Salihin Bin Ali',2),
  ('induk','Setiausaha','Mohamad Syahmi bin Seliman',3),
  ('induk','Bendahari','Muhammad Al Amin Bin Abdullah',4),
  ('induk','Penolong Bendahari','Mohd Farid Bin Ahmed',5),
  -- Ahli Jawatankuasa Biasa
  ('ajk_biasa','Ahli Jawatankuasa 1','Adnan Bin Abdullah',1),
  ('ajk_biasa','Ahli Jawatankuasa 2','Nurul Hidawati Binti Harun',2),
  ('ajk_biasa','Ahli Jawatankuasa 3','Mohamad Dzul Hilmi Bin Mohd Khalid',3),
  ('ajk_biasa','Wakil Pemuda','Muhammad Nabhan Bin Kamaludin',4),
  ('ajk_biasa','Wakil Muslimat','Nurul Fatin Amira Binti Sham Ali',5),
  -- Juruaudit Dalaman (Pemeriksa Kira-kira)
  ('juruaudit','Pemeriksa Kira-kira 1','Shahrudin Bin Tembol',1),
  ('juruaudit','Pemeriksa Kira-kira 2','Ridzuan Bin Ahmad Zaki',2),
  -- Petugas & Staf Surau
  ('staf','Imam 1','Mohd Syamil Bin Mokhtar',1),
  ('staf','Imam 2','Noorhaffizul Bin Nor''azmy',2),
  ('staf','Bilal 1','Syarwani Bin Mat Daud',3),
  ('staf','Bilal 2','Mohamad Fareez Bin Laili',4),
  ('staf','Siak 1','Mohd Azrun Bin Abd.Rahman',5),
  ('staf','Siak 2','Syed Wahiyuddin Bin Syed Mustaman',6),
  ('staf','Pengurus Jenazah Muslimat','Ummi Kalsom Binti Rahmat',7)
) as v(kumpulan, jawatan, nama, susunan)
where not exists (select 1 from agm_jk j where j.agm_id = a.id);
