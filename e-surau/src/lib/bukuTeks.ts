// Teks lalai Buku Laporan — SATU sumber untuk editor (Isi Buku Laporan) & paparan Buku.
// Editor pra-isi dengan teks ini; buku papar teks tersimpan ATAU teks lalai ini.

export type BukuCtx = { tahunAgm: number; thn: number; tarikh?: string | null; masa?: string | null; tempat?: string | null; kuorum?: number | null };

const B = "[__________]";

export function bukuDefaults(c: BukuCtx): Record<string, string> {
  const tarikh = c.tarikh || B;
  const masa = c.masa || "Selepas solat Maghrib berjemaah";
  const tempat = c.tempat || B;
  const kuorum = c.kuorum ? String(c.kuorum) : B;
  return {
    kata_aluan_pengerusi:
`Assalamualaikum warahmatullahi wabarakatuh.

Alhamdulillah, segala puji bagi Allah SWT. Bersyukur ke hadrat Ilahi kerana dengan limpah kurnia-Nya kita dapat bertemu dalam Mesyuarat Agung Tahunan Surau Ar Raudhah bagi tahun ${c.tahunAgm}.

[Perenggan pencapaian — nyatakan 2 hingga 3 pencapaian utama sepanjang tahun.]

[Perenggan cabaran — nyatakan cabaran yang dihadapi dan bagaimana ia ditangani.]

[Perenggan hala tuju — keutamaan untuk tahun hadapan dan harapan kepada ahli kariah.]

Saya merakamkan setinggi-tinggi penghargaan kepada seluruh Ahli Jawatankuasa, ketua biro, imam dan bilal, staf surau, para penaja, serta seluruh ahli kariah Eco Majestic. Saya memohon maaf atas segala kekurangan.

Sekian, wassalamualaikum warahmatullahi wabarakatuh.

[Nama Penuh]
Pengerusi, Surau Ar Raudhah, Eco Majestic`,

    atur_cara:
`7.00 mlm — Ketibaan & pendaftaran kehadiran (kaunter dibuka) — AJK Pendaftaran
7.20 mlm — Solat Maghrib berjemaah — Imam
7.45 mlm — Jamuan — AJK Jamuan
8.25 mlm — Solat Isyak berjemaah — Imam
8.45 mlm — Bacaan Al-Fatihah & Doa Pembuka — Imam
8.50 mlm — Kata-kata aluan & perutusan Pengerusi — Pengerusi
9.00 mlm — Mesyuarat Agung bermula (rujuk Agenda, Bahagian 3) — Pengerusi
9.45 mlm — Sesi soal jawab & pembentangan usul — Pengerusi
10.10 mlm — Perletakan jawatan & pembubaran JK — Pengerusi
10.15 mlm — Pemilihan AJK penggal baharu — Pengerusi Sementara
10.45 mlm — Pengumuman keputusan & ucapan Pengerusi baharu
11.00 mlm — Hal-hal lain & ucapan penangguhan — Pengerusi
11.10 mlm — Tasbih Kaffarah, Al-Asr & Doa Penutup — Imam
11.15 mlm — Bersurai`,

    agenda:
`1.0  Ucapan Pengerusi dan Perutusan Tahunan
2.0  Pengesahan Minit Mesyuarat Agung Tahunan yang lalu
3.0  Perkara Berbangkit daripada Minit yang lalu
4.0  Pembentangan Laporan Setiausaha bagi tahun ${c.tahunAgm}
5.0  Pembentangan Laporan Biro-Biro
6.0  Pembentangan Penyata Kewangan berakhir 31 Disember ${c.thn}
7.0  Pembentangan Laporan Juruaudit Dalaman
8.0  Sesi Soal Jawab dan Perbahasan
9.0  Pembentangan Usul dan Cadangan
10.0  Perletakan Jawatan & Pembubaran Jawatankuasa
11.0  Pemilihan Ahli Jawatankuasa Penggal Baharu
12.0  Hal-Hal Lain
13.0  Penangguhan Mesyuarat`,

    surat_notis:
`NOTIS MESYUARAT AGUNG TAHUNAN SURAU AR RAUDHAH TAHUN ${c.tahunAgm}
Rujukan: SAR/SU/MAT/${c.tahunAgm}/01

Assalamualaikum warahmatullahi wabarakatuh.

Adalah dimaklumkan bahawa Mesyuarat Agung Tahunan Surau Ar Raudhah akan diadakan pada ${tarikh}, ${masa}, bertempat di ${tempat}.

1. Mesyuarat membentangkan Laporan Setiausaha, Laporan Biro-Biro, Penyata Kewangan berakhir 31 Disember ${c.thn} berserta Laporan Juruaudit Dalaman, serta usul untuk kelulusan ahli.
2. Mesyuarat ini juga mesyuarat pemilihan Ahli Jawatankuasa penggal baharu — semua jawatan dikosongkan dan dipertandingkan semula.
3. Hanya ahli berstatus LULUS & AKTIF dalam sistem e-Surau layak mengundi dan dicalonkan. Satu ahli satu undi; tiada proksi.
4. Borang pencalonan & usul hendaklah dikemukakan kepada Setiausaha sebelum tarikh tutup.
5. Kuorum: minimum ${kuorum} orang ahli yang layak mengundi. Jika tidak dicapai dalam 30 minit, mesyuarat ditangguhkan.

Sekian, terima kasih. "Berkhidmat untuk Agama, Kariah dan Negara". Wassalam.

SYAHMI SELIMAN
Setiausaha, Surau Ar Raudhah, Eco Majestic`,

    laporan_setiausaha:
`Assalamualaikum warahmatullahi wabarakatuh dan salam sejahtera.

Alhamdulillah, saya membentangkan Laporan Setiausaha Surau Ar Raudhah bagi tempoh laporan. Laporan ini merangkumi pentadbiran am, mesyuarat jawatankuasa, keahlian, pengurusan aset, pembangunan sistem digital dan dasar tadbir urus.

[Ringkasan pentadbiran: bilangan mesyuarat AJK diadakan, inisiatif utama, dasar baharu.]

[Ringkasan aktiviti & program sepanjang tahun.]`,

    su_cabaran:
`- Pendapatan bermusim, perbelanjaan tetap — Tindakan: kukuhkan infaq langganan, sewaan fasiliti & Rakan Surau.
- Kos program naik apabila surau mengawal mutu — Tindakan: kutipan penajaan, yuran vendor & booth secara berdisiplin.
- Tunggakan yuran khairat — Tindakan: peringatan automatik melalui sistem & kempen kutipan berjadual.
- Kebergantungan kepada segelintir AJK — Tindakan: struktur biro diperkemas & tugasan didokumenkan dalam sistem.`,

    su_penghargaan:
`Setiausaha merakamkan setinggi-tinggi penghargaan kepada Nazir Surau, Pengerusi, seluruh Ahli Jawatankuasa dan ketua biro, imam dan bilal, staf surau, para penaja dan Rakan Surau, serta seluruh ahli kariah Eco Majestic atas sokongan dan kerjasama sepanjang tempoh laporan. Segala kekurangan dipohon kemaafan. Semoga Allah SWT menerima usaha kita semua sebagai amal jariah yang berterusan.`,

    modul_esurau:
`Sistem e-Surau (arraudhahecomajestic.com) merangkumi modul berikut: Keahlian Kariah, Khairat Kematian, Kewangan Surau (ikut tabung), Ibadah & Program, Sewaan Fasiliti, Portal Staf, Sistem Gaji, AGM & Pemilihan, Penajaan & Rakan Surau, serta Pembayaran Digital (CHIP — FPX, kad & e-dompet).

Nilai kepada surau: telus (setiap kutipan & perbelanjaan direkod ikut tabung), selamat (capaian berlapis, mematuhi APDP 2010), dan berterusan (rekod tidak bergantung kepada individu).`,

    ulasan_kewangan:
`[Ulasan Bendahari: nyatakan sumber pendapatan utama, perbelanjaan besar, kedudukan Tabung Am & Tabung Khairat, serta ulasan keseluruhan kedudukan kewangan surau bagi tahun ${c.thn}.]`,

    nota_kewangan:
`1. Asas perakaunan — penyata disediakan atas asas tunai (pendapatan diiktiraf apabila diterima, perbelanjaan apabila dibayar).
2. Tabung Khairat — yuran khairat & pampasan diasingkan daripada Tabung Am.
3. Aset tetap, sumbangan dalam bentuk barangan & perkara luar biasa: [nyatakan jika ada].`,

    perakuan_bendahari:
`Saya, [Nama Penuh], Bendahari Surau Ar Raudhah, dengan ini mengesahkan bahawa penyata kewangan bagi tahun berakhir 31 Disember ${c.thn} yang dibentangkan adalah disediakan berdasarkan rekod kewangan surau dan pada pengetahuan saya adalah benar dan lengkap.

Tarikh: ${B}`,

    laporan_juruaudit:
`Kami, juruaudit dalaman yang dilantik, telah menjalankan semakan ke atas rekod kewangan Surau Ar Raudhah bagi tahun berakhir 31 Disember ${c.thn}.

Skop semakan: buku tunai, resit rasmi, baucar bayaran, penyata bank & rekod sistem e-Surau.
Tarikh audit: ${B}
Penemuan: [nyatakan].
Syor penambahbaikan: [nyatakan].

Pengesahan: Pada pendapat kami, penyata kewangan yang dibentangkan menggambarkan kedudukan kewangan Surau Ar Raudhah pada 31 Disember ${c.thn}.`,

    usul_standard:
`1. Bahawa Mesyuarat mengesahkan minit Mesyuarat Agung Tahunan yang lalu sebagai rekod yang benar.
2. Bahawa Mesyuarat menerima Laporan Setiausaha (Bahagian 6).
3. Bahawa Mesyuarat menerima Laporan Biro-Biro (Bahagian 7).
4. Bahawa Mesyuarat menerima & mengesahkan Penyata Kewangan berakhir 31 Disember ${c.thn} berserta Laporan Juruaudit.
5. Bahawa Mesyuarat meluluskan cadangan belanjawan tahun hadapan & siling peruntukan biro.
6. Bahawa Mesyuarat meluluskan had kuasa perbelanjaan Jawatankuasa.
7. Bahawa Mesyuarat mengesahkan Dasar Kerjasama Pihak Luar & Penajaan.
8. Bahawa Mesyuarat menetapkan kadar yuran & pampasan Skim Khairat Kematian.
9. Bahawa Mesyuarat melantik dua juruaudit dalaman bagi tahun hadapan (bukan AJK, bukan penandatangan akaun).`,
  };
}
