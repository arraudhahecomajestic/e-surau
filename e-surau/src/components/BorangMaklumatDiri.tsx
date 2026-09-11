// Borang Maklumat Diri (BOR-BPM-01) — paparan cetak mengikut format rasmi MAIS.
// Komponen server (tiada hook). Dipakai di halaman cetak calon.

export type CalonDiri = {
  nama: string | null;
  no_kp: string | null;
  alamat: string | null;
  telefon: string | null;
  umur: string | null;
  status_kahwin: string | null;
  pekerjaan: string | null;
  kelayakan_akademik: string | null;
  ahli_berdaftar: boolean | null;
  tinggal_dalam_kariah: boolean | null;
  pengalaman_tadbir: string | null;
  pengalaman_tempoh: string | null;
  ada_penyakit: boolean | null;
  penyakit_nyatakan: string | null;
  tarikh_borang: string | null;
  jawatan_nama?: string | null;
};

function tarikhMs(d: string | null) {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x.getTime())) return d;
  return x.toLocaleDateString("ms-MY", { day: "2-digit", month: "long", year: "numeric" });
}

// Kotak tanda: ( X ) jika dipilih, ( ) jika tidak.
function Kotak({ on }: { on: boolean }) {
  return <span className="bmd-box">({on ? " X " : "   "})</span>;
}

export function GayaBorangDiri() {
  return (
    <style>{`
      .bmd-wrap { background:#fff; color:#000; }
      .bmd-sheet { max-width: 800px; margin: 0 auto; padding: 40px 44px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.35; }
      .bmd-kod { text-align:right; font-weight:800; font-size:15px; letter-spacing:.3px; }
      .bmd-tajuk { text-align:center; font-weight:800; font-size:13px; margin: 6px 0 16px; }
      table.bmd { width:100%; border-collapse:collapse; }
      table.bmd td { border:1px solid #000; padding:8px 10px; vertical-align:top; }
      .bmd-bil { width:44px; text-align:center; font-weight:700; }
      .bmd-perkara { width:38%; font-weight:700; }
      .bmd-box { letter-spacing:1px; white-space:pre; font-weight:700; }
      .bmd-note { margin-top:14px; font-weight:700; padding-left:60px; }
      .bmd-aku { margin-top:12px; text-align:justify; }
      .bmd-benar { margin-top:22px; }
      .bmd-sign { margin-top:34px; }
      .bmd-foot { margin-top:26px; border:1px solid #000; padding:10px 12px; font-size:12px; }
      @media print {
        .no-print { display:none !important; }
        body { background:#fff !important; }
        .bmd-wrap { box-shadow:none !important; }
        .bmd-sheet { padding: 18px 24px; }
        @page { size: A4; margin: 12mm; }
      }
    `}</style>
  );
}

export default function BorangMaklumatDiri({ c }: { c: CalonDiri }) {
  const berkahwin = c.status_kahwin === "berkahwin";
  const bujang = c.status_kahwin === "bujang";
  return (
    <div className="bmd-wrap">
      <div className="bmd-sheet">
        <div className="bmd-kod">BOR-BPM-01</div>
        <div className="bmd-tajuk">BORANG MAKLUMAT DIRI</div>

        <table className="bmd">
          <tbody>
            <tr>
              <td className="bmd-bil"><b>BIL.</b></td>
              <td className="bmd-perkara" style={{ textAlign: "center" }}>PERKARA</td>
              <td style={{ textAlign: "center", fontWeight: 700 }}>MAKLUMAT DIRI</td>
            </tr>
            <tr>
              <td className="bmd-bil">1.</td>
              <td className="bmd-perkara">NAMA</td>
              <td>{c.nama || ""}</td>
            </tr>
            <tr>
              <td className="bmd-bil">2.</td>
              <td className="bmd-perkara">NO KAD PENGENALAN</td>
              <td>{c.no_kp || ""}</td>
            </tr>
            <tr>
              <td className="bmd-bil">3.</td>
              <td className="bmd-perkara">ALAMAT RUMAH</td>
              <td style={{ minHeight: 46 }}>{c.alamat || ""}</td>
            </tr>
            <tr>
              <td className="bmd-bil">4.</td>
              <td className="bmd-perkara">NO TELEFON</td>
              <td>{c.telefon || ""}</td>
            </tr>
            <tr>
              <td className="bmd-bil">5.</td>
              <td className="bmd-perkara">UMUR</td>
              <td>{c.umur || ""}</td>
            </tr>
            <tr>
              <td className="bmd-bil">6.</td>
              <td className="bmd-perkara">STATUS</td>
              <td>BERKAHWIN <Kotak on={berkahwin} />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;BUJANG <Kotak on={bujang} /></td>
            </tr>
            <tr>
              <td className="bmd-bil">7.</td>
              <td className="bmd-perkara">PEKERJAAN</td>
              <td>{c.pekerjaan || ""}</td>
            </tr>
            <tr>
              <td className="bmd-bil">8.</td>
              <td className="bmd-perkara">KELAYAKAN AKADEMIK</td>
              <td>{c.kelayakan_akademik || ""}</td>
            </tr>
            <tr>
              <td className="bmd-bil">9.</td>
              <td className="bmd-perkara">CALON BAGI JAWATAN</td>
              <td>{c.jawatan_nama || ""}</td>
            </tr>
            <tr>
              <td className="bmd-bil">10.</td>
              <td className="bmd-perkara">
                PENGESAHAN AHLI KARIAH<br /><br />
                a)&nbsp;&nbsp;Ahli Berdaftar<br /><br />
                b)&nbsp;&nbsp;Tinggal Dalam Kariah
              </td>
              <td>
                <br />
                Ya <Kotak on={c.ahli_berdaftar === true} />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Tidak <Kotak on={c.ahli_berdaftar === false} /><br /><br />
                Ya <Kotak on={c.tinggal_dalam_kariah === true} />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Tidak <Kotak on={c.tinggal_dalam_kariah === false} />
              </td>
            </tr>
            <tr>
              <td className="bmd-bil">11.</td>
              <td className="bmd-perkara">PENGALAMAN MENTADBIR MASJID DAN SURAU</td>
              <td>
                ( {c.pengalaman_tadbir === "ada" ? "ADA" : c.pengalaman_tadbir === "tiada" ? "TIADA" : "ADA / TIADA"} )<br />
                *Kurang Tiga (3) Tahun <Kotak on={c.pengalaman_tempoh === "kurang_3"} /><br />
                *Lebih Tiga (3) Tahun <Kotak on={c.pengalaman_tempoh === "lebih_3"} />
              </td>
            </tr>
            <tr>
              <td className="bmd-bil">12.</td>
              <td className="bmd-perkara">STATUS KESIHATAN</td>
              <td>
                PENYAKIT ( {c.ada_penyakit === true ? "YA" : c.ada_penyakit === false ? "TIDAK" : "YA / TIDAK"} )<br /><br />
                Jika Ya, Nyatakan:&nbsp;{c.penyakit_nyatakan || "________________________________"}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="bmd-note">*Sila Lampirkan Salinan Kad Pengenalan</div>

        <p className="bmd-aku">
          Saya mengakui segala maklumat yang diberikan adalah benar. Sekiranya didapati maklumat yang
          diberikan tidak benar, saya bersetuju agar pencalonan atau pelantikan saya dibatalkan oleh pihak MAIS.
        </p>

        <div className="bmd-benar">Yang Benar,</div>
        <div className="bmd-sign">(&nbsp;{c.nama ? c.nama.toUpperCase() : "                  "}&nbsp;)</div>
        <div style={{ marginTop: 8 }}>Tarikh:&nbsp;{tarikhMs(c.tarikh_borang)}</div>

        <div className="bmd-foot">
          Borang ini hendaklah diserahkan kepada Setiausaha Jawatankuasa Surau dalam tempoh <b>tiga (3)</b> hari
          selepas Mesyuarat Agung Khas Pencalonan Dan Pemilihan dilaksanakan.
        </div>
      </div>
    </div>
  );
}
