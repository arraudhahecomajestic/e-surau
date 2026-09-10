-- ============================================================
-- Fasa 80 — Senarai Semak Tugasan AGM SAR 2026
-- Ganti kandungan Gerak Kerja (fasa A–E) dengan checklist ikut UNIT + PIC.
-- Guna semula jadual agm_gerak_kerja (fasa = kod unit "01".."12").
-- Idempotent: buang tugasan lama (kod bukan 'u…'), sisip yang baharu;
-- tandaan/catatan pada tugasan 'u…' yang sedia ada TAK terjejas.
-- ============================================================
do $$
declare v_agm uuid;
begin
  select id into v_agm from agm order by tahun desc, dicipta desc limit 1;
  if v_agm is null then return; end if;

  -- Buang tugasan lama berasaskan fasa (kod a*/b*/c*/d*) — kekalkan yang baharu (u*).
  delete from agm_gerak_kerja where agm_id = v_agm and kod !~ '^u';

  insert into agm_gerak_kerja (agm_id, fasa, fasa_nama, kod, tugasan, unit, tarikh_sasaran, nota, susunan, selesai) values
  -- 01 Pengerusi
  (v_agm,'01','Pengerusi / Pengerusi Majlis','u1-1','Pengesahan tarikh, masa & tempat AGM',null,null,null,1,false),
  (v_agm,'01','Pengerusi / Pengerusi Majlis','u1-2','Pengerusikan Mesyuarat Persediaan AJK & luluskan kertas kerja',null,null,null,2,false),
  (v_agm,'01','Pengerusi / Pengerusi Majlis','u1-3','Semak & luluskan atur cara majlis',null,null,null,3,false),
  (v_agm,'01','Pengerusi / Pengerusi Majlis','u1-4','Sedia teks ucapan aluan Pengerusi',null,null,null,4,false),
  (v_agm,'01','Pengerusi / Pengerusi Majlis','u1-5','Taklimat ringkas kepada semua ketua unit sebelum hari',null,null,null,5,false),
  -- 02 Setiausaha
  (v_agm,'02','Setiausaha','u2-1','Muktamadkan kertas kerja AGM & slaid pembentangan',null,null,null,1,false),
  (v_agm,'02','Setiausaha','u2-2','Sedia & edar Notis Mesyuarat rasmi kepada ahli kariah',null,null,null,2,false),
  (v_agm,'02','Setiausaha','u2-3','Kumpul laporan semua biro → susun Buku Laporan Tahunan',null,null,null,3,false),
  (v_agm,'02','Setiausaha','u2-4','Lengkapkan senarai nama JK dalam Buku Laporan',null,null,null,4,false),
  (v_agm,'02','Setiausaha','u2-5','Tetapkan tarikh tutup usul kariah (11 Sep, 5.00 petang)',null,null,null,5,false),
  (v_agm,'02','Setiausaha','u2-6','Cetak & jilid Buku Laporan Tahunan',null,null,null,6,false),
  (v_agm,'02','Setiausaha','u2-7','Sedia salinan cetak pembentangan (sandaran)',null,null,null,7,false),
  (v_agm,'02','Setiausaha','u2-8','Sedia borang minit & senarai kehadiran AJK',null,null,null,8,false),
  -- 03 Bendahari
  (v_agm,'03','Bendahari','u3-1','Siapkan Penyata Kewangan berakhir 31 Dis 2025',null,null,null,1,false),
  (v_agm,'03','Bendahari','u3-2','Sedia ringkasan pendapatan & perbelanjaan untuk slaid',null,null,null,2,false),
  (v_agm,'03','Bendahari','u3-3','Sediakan anggaran belanjawan AGM (jamuan, logistik, cetakan)',null,null,null,3,false),
  (v_agm,'03','Bendahari','u3-4','Serah penyata kepada Juruaudit untuk semakan',null,null,null,4,false),
  (v_agm,'03','Bendahari','u3-5','Sedia wang pendahuluan/float untuk bayaran hari AGM',null,null,null,5,false),
  -- 04 Juruaudit Dalaman
  (v_agm,'04','Juruaudit Dalaman','u4-1','Semak Penyata Kewangan & baucar sokongan',null,null,null,1,false),
  (v_agm,'04','Juruaudit Dalaman','u4-2','Sedia & tandatangan Laporan Juruaudit Dalaman',null,null,null,2,false),
  (v_agm,'04','Juruaudit Dalaman','u4-3','Sahkan penyata sedia untuk dibentangkan',null,null,null,3,false),
  -- 05 Publisiti
  (v_agm,'05','Unit Publisiti & Hebahan','u5-1','Edar Notis Mesyuarat ke semua saluran (surau, WhatsApp, poster)',null,null,null,1,false),
  (v_agm,'05','Unit Publisiti & Hebahan','u5-2','Hebahan usul kariah + pautan borang dalam WhatsApp',null,null,null,2,false),
  (v_agm,'05','Unit Publisiti & Hebahan','u5-3','Sedia poster / banner AGM',null,null,null,3,false),
  (v_agm,'05','Unit Publisiti & Hebahan','u5-4','Peringatan susulan (H-3, H-1) kepada ahli kariah',null,null,null,4,false),
  -- 06 Pendaftaran
  (v_agm,'06','Unit Pendaftaran & Kuorum','u6-1','Jana senarai ahli layak mengundi dari e-Surau',null,null,null,1,false),
  (v_agm,'06','Unit Pendaftaran & Kuorum','u6-2','Cetak borang AGM-1 (kehadiran) & AGM-5 (undian)',null,null,null,2,false),
  (v_agm,'06','Unit Pendaftaran & Kuorum','u6-3','Sedia kaunter, senarai semak & pen daftar',null,null,null,3,false),
  (v_agm,'06','Unit Pendaftaran & Kuorum','u6-4','Kempen kemas kini maklumat ahli (ahli belum sah)',null,null,null,4,false),
  (v_agm,'06','Unit Pendaftaran & Kuorum','u6-5','Sedia pelekat / tanda ahli untuk kuorum',null,null,null,5,false),
  -- 07 Pemilihan
  (v_agm,'07','Unit Pemilihan (AJK 2027–2031)','u7-1','Sahkan senarai jawatan yang dipertandingkan',null,null,null,1,false),
  (v_agm,'07','Unit Pemilihan (AJK 2027–2031)','u7-2','Kumpul & sahkan borang pencalonan',null,null,null,2,false),
  (v_agm,'07','Unit Pemilihan (AJK 2027–2031)','u7-3','Uji modul kiraan undi e-Surau sebelum majlis',null,null,null,3,false),
  (v_agm,'07','Unit Pemilihan (AJK 2027–2031)','u7-4','Sedia borang undian & kertas kira manual (sandaran)',null,null,null,4,false),
  (v_agm,'07','Unit Pemilihan (AJK 2027–2031)','u7-5','Taklimat prosedur pemilihan (angkat tangan)',null,null,null,5,false),
  -- 08 Jamuan
  (v_agm,'08','Unit Jamuan','u8-1','Pilih & sahkan pembekal jamuan','decide','Dapur Rewang · Kak June · Cik Munge',null,1,false),
  (v_agm,'08','Unit Jamuan','u8-2','Pilih menu (Menu 1 / 2 / 3) & sahkan bilangan pax','decide',null,null,2,false),
  (v_agm,'08','Unit Jamuan','u8-3','Sahkan kambing golek + sup + syawarma',null,null,null,3,false),
  (v_agm,'08','Unit Jamuan','u8-4','Tempah minum malam & air',null,null,null,4,false),
  (v_agm,'08','Unit Jamuan','u8-5','Sahkan masa hantar makanan dengan pembekal','decide',null,null,5,false),
  (v_agm,'08','Unit Jamuan','u8-6','Sedia kawasan makan, pinggan mangkuk & tong sampah',null,null,null,6,false),
  -- 09 Logistik
  (v_agm,'09','Unit Logistik & Khemah','u9-1','Pasang khemah besar',null,null,null,1,false),
  (v_agm,'09','Unit Logistik & Khemah','u9-2','Sewa & sahkan 90 kerusi + meja','decide',null,null,2,false),
  (v_agm,'09','Unit Logistik & Khemah','u9-3','Susun atur pentas, kaunter & kawasan majlis',null,null,null,3,false),
  (v_agm,'09','Unit Logistik & Khemah','u9-4','Sedia peti kecemasan (first aid)',null,null,null,4,false),
  (v_agm,'09','Unit Logistik & Khemah','u9-5','Sedia kelengkapan sokongan (kipas, lampu, kabel)',null,null,null,5,false),
  -- 10 Teknikal
  (v_agm,'10','Unit Teknikal (PA / AV / IT)','u10-1','Uji sistem PA, mikrofon & pembesar suara',null,null,null,1,false),
  (v_agm,'10','Unit Teknikal (PA / AV / IT)','u10-2','Uji projektor & skrin pembentangan',null,null,null,2,false),
  (v_agm,'10','Unit Teknikal (PA / AV / IT)','u10-3','Uji talian internet di lokasi khemah',null,null,null,3,false),
  (v_agm,'10','Unit Teknikal (PA / AV / IT)','u10-4','Sedia laptop pembentangan + sandaran fail',null,null,null,4,false),
  (v_agm,'10','Unit Teknikal (PA / AV / IT)','u10-5','Uji sistem e-Surau (daftar hadir & kiraan undi) di lokasi',null,null,null,5,false),
  -- 11 Keselamatan
  (v_agm,'11','Unit Keselamatan & Trafik','u11-1','Atur papan tanda arah & kawasan parkir',null,null,null,1,false),
  (v_agm,'11','Unit Keselamatan & Trafik','u11-2','Susun pengawal parkir & aliran trafik',null,null,null,2,false),
  (v_agm,'11','Unit Keselamatan & Trafik','u11-3','Sedia pengumuman keselamatan & titik berkumpul',null,null,null,3,false),
  -- 12 Laporan Biro (9 biro)
  (v_agm,'12','Laporan Biro (9 biro)','u12-1','Laporan Biro Pengurusan, Pentadbiran & Perancangan Strategik',null,'PIC: belum ditetapkan',null,1,false),
  (v_agm,'12','Laporan Biro (9 biro)','u12-2','Laporan Biro Dakwah & Pendidikan Kekeluargaan',null,'PIC: belum ditetapkan',null,2,false),
  (v_agm,'12','Laporan Biro (9 biro)','u12-3','Laporan Biro Pemuda, Sukan & Rekreasi',null,'PIC: Muhammad Nabhan (Wakil Pemuda)',null,3,false),
  (v_agm,'12','Laporan Biro (9 biro)','u12-4','Laporan Biro Muslimat',null,'PIC: Nurul Fatin Amira (Wakil Muslimat)',null,4,false),
  (v_agm,'12','Laporan Biro (9 biro)','u12-5','Laporan Biro Multimedia & Perhubungan Awam',null,'PIC: belum ditetapkan',null,5,false),
  (v_agm,'12','Laporan Biro (9 biro)','u12-6','Laporan Biro Kebajikan, Khairat Kematian & Kemasyarakatan',null,'PIC: belum ditetapkan',null,6,false),
  (v_agm,'12','Laporan Biro (9 biro)','u12-7','Laporan Biro Pengurusan Jenazah & Tanah Kubur',null,'PIC: belum ditetapkan',null,7,false),
  (v_agm,'12','Laporan Biro (9 biro)','u12-8','Laporan Biro Penyelenggaraan & Pembangunan',null,'PIC: belum ditetapkan',null,8,false),
  (v_agm,'12','Laporan Biro (9 biro)','u12-9','Laporan Biro Hospitaliti & Keselamatan',null,'PIC: belum ditetapkan',null,9,false),
  (v_agm,'12','Laporan Biro (9 biro)','u12-10','Semua laporan diserah kepada Setiausaha (H-2)',null,null,null,10,false)
  on conflict (agm_id, kod) do nothing;
end $$;
