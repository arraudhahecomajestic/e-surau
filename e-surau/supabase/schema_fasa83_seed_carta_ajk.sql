-- ============================================================
-- Fasa 83 — Seed Carta Organisasi (19 AJK) ke carta_organisasi
-- Nama & jawatan diisi siap; admin cuma perlu muat naik gambar.
-- Hanya seed jika jadual masih kosong (elak duplikasi).
-- ============================================================
insert into carta_organisasi (jawatan, nama, susunan, aktif)
select v.jawatan, v.nama, v.susunan, true
from (values
  ('Pengerusi','Mohd Thalji Bin Ahmad Bakery',1),
  ('Timbalan Pengerusi','Mohammed Salihin Bin Ali',2),
  ('Setiausaha','Mohamad Syahmi bin Seliman',3),
  ('Bendahari','Muhammad Al Amin Bin Abdullah',4),
  ('Penolong Bendahari','Mohd Farid Bin Ahmed',5),
  ('Imam 1','Mohd Syamil Bin Mokhtar',6),
  ('Imam 2','Noorhaffizul Bin Nor''azmy',7),
  ('Bilal 1','Syarwani Bin Mat Daud',8),
  ('Bilal 2','Mohamad Fareez Bin Laili',9),
  ('Siak 1','Mohd Azrun Bin Abd. Rahman',10),
  ('Siak 2','Syed Wahiyuddin Bin Syed Mustaman',11),
  ('Ahli Jawatankuasa','Adnan Bin Abdullah',12),
  ('Ahli Jawatankuasa','Nurul Hidawati Binti Harun',13),
  ('Ahli Jawatankuasa','Mohamad Dzul Hilmi Bin Mohd Khalid',14),
  ('Wakil Pemuda','Muhammad Nabhan Bin Kamaludin',15),
  ('Wakil Muslimat','Nurul Fatin Amira Binti Sham Ali',16),
  ('Pemeriksa Kira-kira 1','Shahrudin Bin Tembol',17),
  ('Pemeriksa Kira-kira 2','Ridzuan Bin Ahmad Zaki',18),
  ('Pengurus Jenazah Muslimat','Ummi Kalsom Binti Rahmat',19)
) as v(jawatan, nama, susunan)
where not exists (select 1 from carta_organisasi);
