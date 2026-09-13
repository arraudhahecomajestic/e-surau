// Borang Pengisytiharan Calon/Pemenang AJK (BOR-BPM-05, 06, 07) — paparan cetak
// mengikut format rasmi MAIS. Komponen server (tiada hook).

export type PengisytiharanData = { nama: string | null; no_kp: string | null };

function Isi({ v, w = 260 }: { v: string | null; w?: number }) {
  return <u style={{ display: "inline-block", minWidth: w, textAlign: "center", fontWeight: 700 }}>{v || " "}</u>;
}
function Kotak() {
  return <span className="pf-box">☐</span>;
}

export function GayaPengisytiharan() {
  return (
    <style>{`
      .pf-wrap { background:#fff; color:#000; }
      .pf-sheet { max-width: 820px; margin: 0 auto 24px; padding: 44px 48px; font-family: Arial, Helvetica, sans-serif; font-size: 12.5px; line-height: 1.55; background:#fff; }
      .pf-sulit { display:flex; justify-content:space-between; font-weight:800; font-size:12px; }
      .pf-logo { display:block; margin:8px auto 2px; width:62px; height:auto; }
      .pf-tajuk { text-align:center; font-weight:800; font-size:13px; margin:6px 0 4px; text-transform:uppercase; }
      .pf-sub { text-align:center; font-size:12px; margin-bottom:16px; font-style:italic; }
      .pf-p { text-align:justify; margin:10px 0; }
      .pf-klausa { display:flex; gap:8px; margin:8px 0; text-align:justify; }
      .pf-box { font-size:15px; line-height:1; }
      .pf-atau { text-align:center; font-weight:700; margin:6px 0; }
      .pf-sign { margin-top:26px; }
      .pf-sign div { margin-bottom:12px; }
      .pf-nota { margin-top:14px; font-size:11px; }
      .pf-foot { text-align:center; font-weight:800; font-size:12px; margin-top:18px; border-top:1px solid #000; padding-top:6px; }
      @media print {
        .no-print { display:none !important; }
        body { background:#fff !important; }
        .pf-wrap { box-shadow:none !important; }
        .pf-sheet { padding: 6px 10px; margin:0; page-break-after: always; }
        .pf-sheet:last-child { page-break-after: auto; }
        @page { size:A4; margin:14mm; }
      }
    `}</style>
  );
}

function Ikrar({ akta }: { akta: string }) {
  return (
    <>
      <p className="pf-p">
        Saya dengan sesungguhnya berikrar dan bersumpah bahawa maklumat yang saya berikan di atas adalah benar,
        betul dan lengkap. Saya faham sekiranya maklumat yang saya berikan di atas adalah palsu dan/atau tidak benar
        saya boleh dikenakan hukuman denda dan/atau penjara di bawah {akta} dan/atau Enakmen Pentadbiran Agama Islam
        (Negeri Selangor) 2003 dan/atau mana-mana undang-undang bertulis terpakai.
      </p>
      <p className="pf-p">
        Saya faham bahawa jika saya didapati melanggar apa-apa pengisytiharan ini, pihak Majlis Agama Islam Selangor
        (MAIS) berhak mengambil apa-apa tindakan sewajarnya termasuk tetapi tidak terhad kepada pembatalan perlantikan
        atau tauliah saya di bawah Enakmen Pentadbiran Agama Islam (Negeri Selangor) 2003, peraturan-peraturan,
        kaedah-kaedah, garis-garis panduan yang terpakai.
      </p>
    </>
  );
}

function Tandatangan({ nama }: { nama: string | null }) {
  return (
    <div className="pf-sign">
      <div>Dibuat dan diakui oleh:</div>
      <div>Tandatangan&nbsp;:&nbsp; ______________________________</div>
      <div>Nama&nbsp;:&nbsp; <Isi v={nama ? nama.toUpperCase() : ""} w={300} /></div>
      <div>Tarikh&nbsp;:&nbsp; ______________________________</div>
      <div className="pf-nota">*Sila tanda pada kotak yang berkenaan sahaja.</div>
    </div>
  );
}

function Intro({ c }: { c: PengisytiharanData }) {
  return (
    <p className="pf-p">
      Saya, <Isi v={c.nama ? c.nama.toUpperCase() : ""} />, No. Kad Pengenalan <Isi v={c.no_kp} w={180} />,
      menyedari dan bertanggungjawab bagi memastikan masjid dan surau sebagai pusat peribadatan umat Islam setempat,
      pusat keilmuan Islam, pusat dakwah dan tarbiah dan masjid sebagai pusat tanggungjawab keprihatinan sosial
      setempat dapat direalisasikan. Dengan itu, saya mengisytiharkan bahawa—
    </p>
  );
}

export default function BorangPengisytiharan({ c }: { c: PengisytiharanData }) {
  return (
    <div className="pf-wrap">
      {/* ---------- BOR-BPM-05: BEBAS POLITIK ---------- */}
      <article className="pf-sheet">
        <div className="pf-sulit"><span>SULIT</span><span>(BOR-BPM-05)</span></div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mais.png" alt="Majlis Agama Islam Selangor" className="pf-logo" />
        <div className="pf-tajuk">Borang Pengisytiharan Parti Politik</div>
        <div className="pf-sub">(Bagi Calon Jawatankuasa Surau)</div>
        <Intro c={c} />
        <div className="pf-klausa"><Kotak /><span>Saya tidak memegang sebarang jawatan dalam mana-mana parti politik di pelbagai peringkat (Cawangan / Bahagian / Negeri / Nasional), tidak bekerja dengan mana-mana ahli politik, serta tidak akan terlibat dalam apa-apa aktiviti, percakapan atau perbuatan yang boleh menjejaskan prinsip berkecuali atau menunjukkan kecenderungan kepada mana-mana parti politik; dan saya berjanji tidak akan melibatkan diri dalam sebarang kegiatan aktif politik yang boleh menjejaskan imej masjid.</span></div>
        <div className="pf-atau">atau;</div>
        <div className="pf-klausa"><Kotak /><span>Saya memegang jawatan dalam mana-mana parti politik dan/atau bekerja dengan mana-mana ahli politik; dan saya berjanji tidak akan menggunakan kedudukan dan/atau jawatan sebagai ahli jawatankuasa masjid atau surau bagi menyokong, mempromosi, berkempen atau menjalankan apa-apa aktiviti yang berkaitan dengan kepentingan mana-mana parti politik.</span></div>
        <Ikrar akta="Kanun Keseksaan (Akta 574)" />
        <Tandatangan nama={c.nama} />
        <div className="pf-foot">SULIT</div>
      </article>

      {/* ---------- BOR-BPM-06: BEBAS REKOD JENAYAH ---------- */}
      <article className="pf-sheet">
        <div className="pf-sulit"><span>SULIT</span><span>(BOR-BPM-06)</span></div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mais.png" alt="Majlis Agama Islam Selangor" className="pf-logo" />
        <div className="pf-tajuk">Borang Pengisytiharan Bebas Rekod Jenayah dan Tindakan Undang-Undang</div>
        <div className="pf-sub">(Bagi Calon Jawatankuasa Surau)</div>
        <Intro c={c} />
        <div className="pf-klausa"><Kotak /><span>Saya tidak pernah disabitkan dengan mana-mana kesalahan jenayah di Mahkamah Sivil di bawah Kanun Keseksaan (Akta 574) dan/atau mana-mana undang-undang Persekutuan lain; tidak pernah disabitkan dengan kesalahan jenayah syariah di Mahkamah Syariah di bawah enakmen berkaitan Negeri Selangor; dan tidak terlibat dalam apa-apa prosiding kehakiman dan/atau tindakan undang-undang (jenayah, sivil atau syariah).</span></div>
        <div className="pf-atau">atau;</div>
        <div className="pf-klausa"><Kotak /><span>Saya terlibat dalam prosiding kehakiman dan/atau tindakan undang-undang (*jenayah / sivil / syariah), butiran seperti berikut: ______________________________________________________________________________ . Saya bersetuju memberikan kerjasama kepada MAIS untuk membuat pengisytiharan tambahan mengenai status prosiding dari semasa ke semasa.</span></div>
        <Ikrar akta="Kanun Keseksaan (Akta 574)" />
        <Tandatangan nama={c.nama} />
        <div className="pf-foot">SULIT</div>
      </article>

      {/* ---------- BOR-BPM-07: BEBAS KEBANKRAPAN ---------- */}
      <article className="pf-sheet">
        <div className="pf-sulit"><span>SULIT</span><span>(BOR-BPM-07)</span></div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mais.png" alt="Majlis Agama Islam Selangor" className="pf-logo" />
        <div className="pf-tajuk">Borang Pengisytiharan Kebankrapan dan Keberhutangan Melampau</div>
        <div className="pf-sub">(Bagi Calon Jawatankuasa Surau)</div>
        <Intro c={c} />
        <div className="pf-klausa"><Kotak /><span>Saya tidak pernah diisytiharkan bankrap di bawah Akta Insolvensi 1967 (Akta 360).</span></div>
        <div className="pf-atau">atau;</div>
        <div className="pf-klausa"><Kotak /><span>Saya pernah diisytiharkan bankrap tetapi telah mendapat perintah pelepasan (discharge) dan/atau perintah pembatalan (annulment) yang sah daripada Jabatan Insolvensi Malaysia.</span></div>
        <div className="pf-atau">atau;</div>
        <div className="pf-klausa"><Kotak /><span>Saya sedang dalam prosiding kebankrapan dan mengakujanji untuk membuat pengisytiharan tambahan mengenai status prosiding, kewangan dan keberhutangan saya kepada MAIS dari semasa ke semasa.</span></div>
        <div className="pf-klausa"><Kotak /><span>Saya tidak / mempunyai keberhutangan yang melampau (jumlah potongan hutang atau obligasi kewangan melebihi 60% daripada jumlah pendapatan bulanan saya). *Sila tanda pilihan berkenaan.</span></div>
        <div className="pf-klausa"><Kotak /><span>Saya tidak terlibat dalam aktiviti penggubahan wang haram atau membuat pinjaman/pembiayaan/kemudahan kredit daripada mana-mana pihak yang tidak dilesenkan oleh Bank Negara Malaysia (BNM). Saya bersetuju memberikan kerjasama kepada MAIS untuk memeriksa rekod berkaitan status kewangan &amp; keberhutangan saya apabila diminta.</span></div>
        <Ikrar akta="Kanun Keseksaan (Akta 574) dan/atau Akta Insolvensi 1967" />
        <Tandatangan nama={c.nama} />
        <div className="pf-foot">SULIT</div>
      </article>
    </div>
  );
}
