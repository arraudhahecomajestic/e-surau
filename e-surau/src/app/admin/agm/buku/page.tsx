import Link from "next/link";
import { getProfil, isPentadbir } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { NAMA_SURAU } from "@/lib/tetapan";
import ButangCetak from "@/components/ButangCetak";

export const dynamic = "force-dynamic";

const n = (x: any) => Number(x) || 0;
const rm = (v: number) => v ? "RM " + v.toLocaleString("ms-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) + "%" : "—");
const BLANK = "[__________]";
const yr = (d: any) => String(d?.tarikh ?? "").slice(0, 4);

const KAWASAN: Record<string, string> = {
  cradleton: "Cradleton", tenderfield: "Tenderfield", stoneridge: "Stoneridge",
  mellowood: "Mellowood", merrydale: "Merrydale", cheerywood: "Cheerywood",
  karisma: "Apartment Karisma", harmoni: "Apartment Harmoni", simfoni: "Apartment Simfoni", lain: "Lain-lain",
};
const KUMP_JK = [
  { kod: "penaung", label: "Penaung & Penasihat" }, { kod: "induk", label: "Jawatankuasa Induk" },
  { kod: "ketua_biro", label: "Ketua Biro" }, { kod: "ajk_biasa", label: "Ahli Jawatankuasa Biasa" },
  { kod: "juruaudit", label: "Juruaudit Dalaman" }, { kod: "staf", label: "Petugas & Staf Surau" },
];

// Pemetaan kategori sistem -> baris tetap Buku Laporan (padanan kata kunci)
const SUMBER = [
  { label: "Kutipan tabung / derma jemaah", kw: ["tabung", "derma", "kutipan", "jemaah", "infak"] },
  { label: "Infaq langganan", kw: ["infaq", "langganan"] },
  { label: "Yuran Khairat Kematian", kw: ["khairat"], khairat: true },
  { label: "Wakaf", kw: ["wakaf"] },
  { label: "Sewaan ruang dan peralatan", kw: ["sewa"] },
  { label: "Penajaan dan yuran vendor", kw: ["penaja", "vendor", "booth", "tajaan"] },
  { label: "Sumbangan / peruntukan pihak luar", kw: ["sumbangan", "peruntukan", "luar", "geran"] },
  { label: "Tabung khas / program", kw: ["program", "khas"] },
];
const KATEGORI_B = [
  { label: "Utiliti — elektrik, air, internet", kw: ["utiliti", "elektrik", "air", "internet", "tnb", "bil"] },
  { label: "Emolumen dan elaun", kw: ["gaji", "emolumen", "elaun", "upah", "saraan"] },
  { label: "Penyelenggaraan dan kebersihan", kw: ["selenggara", "kebersihan", "baik pulih", "servis", "cuci"] },
  { label: "Program dan dakwah", kw: ["program", "dakwah", "ceramah", "kuliah", "majlis"] },
  { label: "Khairat kematian — pampasan", kw: ["khairat", "pampasan", "jenazah"], khairat: true },
  { label: "Pentadbiran dan sistem", kw: ["pentadbiran", "sistem", "admin", "cetak", "alat tulis", "pejabat"] },
  { label: "Kebajikan kariah", kw: ["kebajikan", "asnaf", "bantuan"] },
  { label: "Pembelian aset dan peralatan", kw: ["aset", "peralatan", "beli", "perabot", "kelengkapan"] },
];

export default async function BukuLaporanPage({ searchParams }: { searchParams?: { tahun?: string } }) {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isPentadbir(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const { data: agmRows } = await db.from("agm").select("*").order("tahun", { ascending: false }).order("dicipta", { ascending: false }).limit(1);
  const agm = (agmRows as any[])?.[0] ?? null;
  if (!agm) return <div className="mx-auto max-w-3xl"><Link href="/admin/agm" className="text-sm text-surau hover:underline">← Kembali ke AGM</Link><div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Sila cipta maklumat AGM dahulu.</div></div>;

  const tahunAgm = agm.tahun ?? new Date().getFullYear();
  const thn = Number(searchParams?.tahun) || (tahunAgm - 1);   // tahun kewangan berakhir
  const thnL = thn - 1;                                         // tahun perbandingan
  const dMula = `${thnL}-01-01`, dTamat = `${thn}-12-31`;

  const [teksRes, jkRes, biroRes, usulRes, ahliRes, tggRes, kutRes, belRes, khaRes, progRes] = await Promise.all([
    db.from("agm_laporan_teks").select("kunci, nilai").eq("agm_id", agm.id),
    db.from("agm_jk").select("kumpulan, jawatan, nama, susunan").eq("agm_id", agm.id).order("kumpulan").order("susunan"),
    db.from("agm_biro").select("nama, ketua, setiausaha, ahli, laporan, susunan").eq("agm_id", agm.id).order("susunan"),
    db.from("agm_usul").select("no, tajuk, keterangan, keputusan, undi_setuju, undi_tolak, undi_berkecuali").eq("agm_id", agm.id).order("no"),
    db.from("ahli_kariah").select("status, aktif, kawasan, tarikh_daftar").limit(20000),
    db.from("tanggungan").select("id", { count: "exact", head: true }),
    db.from("kutipan").select("jumlah, tarikh, kategori:kategori_kutipan(nama, jenis_khairat)").gte("tarikh", dMula).lte("tarikh", dTamat).limit(40000),
    db.from("perbelanjaan").select("jumlah, tarikh, dari_khairat, kategori:kategori_belanja(nama)").eq("status", "dibayar").gte("tarikh", dMula).lte("tarikh", dTamat).limit(40000),
    db.from("keahlian_khairat").select("status").limit(20000),
    db.from("program").select("tarikh, dibuang_pada").is("dibuang_pada", null).gte("tarikh", `${thn}-01-01`).lte("tarikh", dTamat).limit(5000),
  ]);

  const teks: Record<string, string> = {}; for (const r of ((teksRes.data as any[]) ?? [])) teks[r.kunci] = r.nilai ?? "";
  const jk = (jkRes.data as any[]) ?? [], biro = (biroRes.data as any[]) ?? [], usul = (usulRes.data as any[]) ?? [];
  const ahli = (ahliRes.data as any[]) ?? [], kutipan = (kutRes.data as any[]) ?? [], belanja = (belRes.data as any[]) ?? [];
  const khairat = (khaRes.data as any[]) ?? [], program = (progRes.data as any[]) ?? [];
  const bilTanggungan = (tggRes as any)?.count ?? null;

  // Keahlian
  const lulus = ahli.filter((a) => a.status === "lulus");
  const aktif = lulus.filter((a) => a.aktif).length;
  const menunggu = ahli.filter((a) => a.status === "menunggu").length;
  const baru = ahli.filter((a) => String(a.tarikh_daftar ?? "").slice(0, 4) === String(thn)).length;
  const ikutFasa = Object.keys(KAWASAN).map((kod) => ({ label: KAWASAN[kod], bil: lulus.filter((a) => (a.kawasan ?? "lain") === kod).length })).filter((x) => x.bil > 0);
  const khairatAktif = khairat.filter((k) => k.status === "aktif").length;
  const khairatTunggak = khairat.filter((k) => k.status === "tertunggak").length;

  // Kewangan — 2 tahun
  const kut = (t: number) => kutipan.filter((k) => yr(k) === String(t));
  const bel = (t: number) => belanja.filter((b) => yr(b) === String(t));
  const total = (arr: any[]) => arr.reduce((s, x) => s + n(x.jumlah), 0);
  const cocok = (nama: string, kw: string[]) => { const s = (nama ?? "").toLowerCase(); return kw.some((k) => s.includes(k)); };
  const bucketMasuk = (arr: any[]) => {
    const res = SUMBER.map((s) => ({ label: s.label, jum: 0 })); let lain = 0;
    for (const k of arr) {
      const nm = k.kategori?.nama ?? ""; const kh = !!k.kategori?.jenis_khairat; const v = n(k.jumlah);
      const idx = SUMBER.findIndex((s) => (s.khairat ? kh : false) || cocok(nm, s.kw));
      if (idx >= 0) res[idx].jum += v; else lain += v;
    }
    return [...res, { label: "Lain-lain", jum: lain }];
  };
  const bucketKeluar = (arr: any[]) => {
    const res = KATEGORI_B.map((s) => ({ label: s.label, jum: 0 })); let lain = 0;
    for (const b of arr) {
      const nm = b.kategori?.nama ?? ""; const kh = !!b.dari_khairat; const v = n(b.jumlah);
      const idx = KATEGORI_B.findIndex((s) => (s.khairat ? kh : false) || cocok(nm, s.kw));
      if (idx >= 0) res[idx].jum += v; else lain += v;
    }
    return [...res, { label: "Lain-lain", jum: lain }];
  };
  const masuk25 = bucketMasuk(kut(thn)), masuk24 = bucketMasuk(kut(thnL));
  const keluar25 = bucketKeluar(bel(thn)), keluar24 = bucketKeluar(bel(thnL));
  const tMasuk25 = total(kut(thn)), tMasuk24 = total(kut(thnL));
  const tKeluar25 = total(bel(thn)), tKeluar24 = total(bel(thnL));
  // Tabung (terimaan/bayaran ikut tahun)
  const masukKhairat = (t: number) => kut(t).filter((k) => k.kategori?.jenis_khairat).reduce((s, k) => s + n(k.jumlah), 0);
  const keluarKhairat = (t: number) => bel(t).filter((b) => b.dari_khairat).reduce((s, b) => s + n(b.jumlah), 0);

  // ---- komponen ----
  const H1 = ({ no, t }: { no: number | string; t: string }) => (<div className="mb-4 mt-2 border-b-2 border-surau pb-1"><div className="text-xs font-semibold uppercase tracking-widest text-surau/70">{typeof no === "number" ? `Bahagian ${no}` : no}</div><h2 className="text-xl font-extrabold text-slate-900">{t}</h2></div>);
  const H2 = ({ t }: { t: string }) => <h3 className="mt-4 mb-1.5 font-bold text-slate-800">{t}</h3>;
  const Teks = ({ k, fallback }: { k: string; fallback?: string }) => teks[k]?.trim() ? <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{teks[k]}</div> : <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-500">{fallback ?? ""}{!fallback && <span className="print-hide">(Belum diisi — isi di Naratif Laporan)</span>}</div>;
  const Sec = ({ children, pecah = true }: { children: React.ReactNode; pecah?: boolean }) => <section className={`mb-8 ${pecah ? "break-before-page" : ""}`}>{children}</section>;

  const cellR = "border border-slate-200 px-2 py-1 text-right font-mono";
  const cellL = "border border-slate-200 px-2 py-1";
  const Th = ({ children }: { children: React.ReactNode }) => <th className="border border-slate-300 bg-slate-50 px-2 py-1 text-left text-xs font-bold uppercase text-slate-600">{children}</th>;

  const namaBiroDoc = ["Biro Pendidikan & Dakwah", "Biro Pembangunan & Penyelenggaraan", "Biro Kebajikan & Khairat Kematian", "Biro Muslimat", "Biro Belia & Remaja", "Biro Media, Teknologi & Penajaan"];

  return (
    <div className="mx-auto max-w-3xl text-slate-800">
      <div className="print-hide mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/agm" className="text-sm text-surau hover:underline">← Kembali ke AGM</Link>
        <div className="flex items-center gap-2"><span className="text-xs text-slate-500">Kewangan {thn} (banding {thnL})</span><ButangCetak label="Cetak / PDF" /></div>
      </div>

      {/* KULIT */}
      <div className="mb-8 break-after-page rounded-xl border-2 border-surau/40 bg-surau/5 px-8 py-16 text-center">
        <div className="text-base font-extrabold uppercase tracking-wide text-surau">Surau Ar Raudhah</div>
        <div className="text-xs text-slate-500">Eco Majestic, 43500 Semenyih, Selangor Darul Ehsan</div>
        <div className="mt-12 text-3xl font-black text-slate-900">BUKU LAPORAN TAHUNAN</div>
        <div className="text-2xl font-bold text-surau">TAHUN {tahunAgm}</div>
        <div className="mt-10 text-sm text-slate-600">Dibentangkan dalam</div>
        <div className="text-lg font-bold text-slate-800">Mesyuarat Agung Tahunan {tahunAgm}</div>
        <div className="text-sm text-slate-600">{agm.tarikh ?? BLANK}{agm.masa ? ` · ${agm.masa}` : ""}</div>
        <div className="mt-12 text-xs text-slate-500">Disediakan oleh Setiausaha Surau Ar Raudhah</div>
        <div className="text-xs font-semibold text-surau">arraudhahecomajestic.com</div>
      </div>

      {/* ISI KANDUNGAN */}
      <Sec pecah={false}>
        <H1 no="Isi Kandungan" t="Isi Kandungan" />
        <ol className="list-decimal space-y-1 pl-6 text-sm">
          <li>Kata-Kata Aluan Pengerusi</li><li>Atur Cara Mesyuarat Agung Tahun {tahunAgm}</li><li>Agenda Mesyuarat Agung Tahun {tahunAgm}</li>
          <li>Senarai Nama Jawatankuasa Surau Ar Raudhah</li><li>Surat Notis Mesyuarat Agung Tahun {tahunAgm}</li><li>Laporan Setiausaha</li>
          <li>Laporan Biro-Biro</li><li>Laporan Penyata Kewangan Berakhir 31 Disember {thn}</li><li>Pembentangan Usul / Cadangan</li>
        </ol>
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500"><b>Nota Penyediaan:</b> Buku ini disediakan oleh Setiausaha untuk edaran kepada ahli kariah. Ruangan bertanda {BLANK} hendaklah diisi dengan maklumat sebenar sebelum dicetak. Angka keahlian &amp; kewangan dijana automatik dari sistem e-Surau.</p>
      </Sec>

      {/* B1 KATA ALUAN */}
      <Sec><H1 no={1} t="Kata-Kata Aluan Pengerusi" />
        <Teks k="kata_aluan_pengerusi" fallback={`Assalamualaikum warahmatullahi wabarakatuh.\n\nAlhamdulillah, bersyukur ke hadrat Allah SWT kerana dengan limpah kurnia-Nya kita dapat bertemu dalam Mesyuarat Agung Tahunan Surau Ar Raudhah bagi tahun ${tahunAgm}.\n\n(Sila jana teks penuh di Naratif Laporan — butang Bantu tulis AI.)`} />
      </Sec>

      {/* B2 ATUR CARA */}
      <Sec><H1 no={2} t={`Atur Cara Mesyuarat Agung Tahun ${tahunAgm}`} />
        <table className="mb-3 w-full border-collapse text-sm"><tbody>
          <tr><td className={cellL + " font-semibold"}>Tarikh</td><td className={cellL}>{agm.tarikh ?? BLANK}</td></tr>
          <tr><td className={cellL + " font-semibold"}>Masa</td><td className={cellL}>{agm.masa ?? "Selepas solat Maghrib berjemaah"}</td></tr>
          <tr><td className={cellL + " font-semibold"}>Tempat</td><td className={cellL}>{agm.tempat ?? BLANK}</td></tr>
        </tbody></table>
        <table className="w-full border-collapse text-sm"><thead><tr><Th>Masa</Th><Th>Perkara</Th><Th>Tanggungjawab</Th></tr></thead><tbody>
          {[["7.00 mlm","Ketibaan & pendaftaran kehadiran (kaunter dibuka)","AJK Pendaftaran"],["7.20 mlm","Solat Maghrib berjemaah","Imam"],["7.45 mlm","Jamuan","AJK Jamuan"],["8.25 mlm","Solat Isyak berjemaah","Imam"],["8.45 mlm","Bacaan Al-Fatihah & Doa Pembuka","Imam"],["8.50 mlm","Kata-kata aluan & perutusan Pengerusi","Pengerusi"],["9.00 mlm","Mesyuarat Agung bermula (rujuk Agenda, Bahagian 3)","Pengerusi"],["9.45 mlm","Sesi soal jawab & pembentangan usul","Pengerusi"],["10.10 mlm","Perletakan jawatan & pembubaran JK","Pengerusi"],["10.15 mlm","Pemilihan AJK penggal baharu","Pengerusi Sementara"],["10.45 mlm","Pengumuman keputusan & ucapan Pengerusi baharu","Pengendali Pemilihan"],["11.00 mlm","Hal-hal lain & ucapan penangguhan","Pengerusi"],["11.10 mlm","Tasbih Kaffarah, Al-Asr & Doa Penutup","Imam"],["11.15 mlm","Bersurai","—"]].map((r,i)=>(<tr key={i}><td className={cellL+" whitespace-nowrap text-slate-500"}>{r[0]}</td><td className={cellL}>{r[1]}</td><td className={cellL+" text-slate-500"}>{r[2]}</td></tr>))}
        </tbody></table>
        <p className="mt-2 text-[11px] text-slate-400">Waktu adalah anggaran; sahkan waktu Maghrib/Isyak zon SGR01 pada {agm.tarikh ?? tahunAgm}. Atur cara tertakluk pindaan Pengerusi.{agm.atur_cara?.trim() ? " Nota tambahan tersimpan dalam Maklumat Mesyuarat." : ""}</p>
      </Sec>

      {/* B3 AGENDA */}
      <Sec><H1 no={3} t={`Agenda Mesyuarat Agung Tahun ${tahunAgm}`} />
        <table className="w-full border-collapse text-sm"><tbody>
          {[["1.0","Ucapan Pengerusi dan Perutusan Tahunan"],["2.0","Pengesahan Minit Mesyuarat Agung Tahunan yang lalu"],["3.0","Perkara Berbangkit daripada Minit yang lalu"],["4.0",`Pembentangan Laporan Setiausaha bagi tahun ${tahunAgm}`],["5.0","Pembentangan Laporan Biro-Biro"],["","5.1 – 5.6  "+namaBiroDoc.join(" · ")],["6.0",`Pembentangan Penyata Kewangan berakhir 31 Disember ${thn}`],["7.0","Pembentangan Laporan Juruaudit Dalaman"],["8.0","Sesi Soal Jawab dan Perbahasan"],["9.0","Pembentangan Usul dan Cadangan"],["10.0","Perletakan Jawatan & Pembubaran Jawatankuasa"],["11.0","Pemilihan Ahli Jawatankuasa Penggal Baharu"],["12.0","Hal-Hal Lain"],["13.0","Penangguhan Mesyuarat"]].map((r,i)=>(<tr key={i} className="border-b border-slate-100"><td className={"w-12 px-2 py-1 font-bold text-surau"+(r[0]?"":" text-transparent")}>{r[0]||"·"}</td><td className={"px-2 py-1 "+(r[0]?"":"text-slate-500")}>{r[1]}</td></tr>))}
        </tbody></table>
      </Sec>

      {/* B4 SENARAI JK */}
      <Sec><H1 no={4} t="Senarai Nama Jawatankuasa Surau Ar Raudhah" />
        {jk.length === 0 ? <p className="text-sm text-slate-400 print-hide">(Belum ada — isi di Senarai JK &amp; Biro)</p> : (
          <div className="space-y-4">{KUMP_JK.filter((k) => jk.some((j) => j.kumpulan === k.kod)).map((k) => (
            <div key={k.kod} className="break-inside-avoid"><div className="mb-1 text-xs font-bold uppercase tracking-wide text-surau">{k.label}</div>
              <table className="w-full border-collapse text-sm"><tbody>{jk.filter((j) => j.kumpulan === k.kod).map((j, i) => (<tr key={i} className="border-b border-slate-100"><td className="w-8 py-1 text-slate-400">{i + 1}.</td><td className="py-1 font-medium text-slate-700">{j.jawatan}</td><td className="py-1 text-slate-800">{j.nama}</td></tr>))}</tbody></table>
            </div>))}</div>)}
        <p className="mt-3 text-xs text-slate-400">Rekod kehadiran mesyuarat jawatankuasa: {BLANK} (isi manual).</p>
      </Sec>

      {/* B5 SURAT NOTIS */}
      <Sec><H1 no={5} t={`Surat Notis Mesyuarat Agung Tahun ${tahunAgm}`} />
        <table className="mb-3 w-full border-collapse text-sm"><tbody>
          <tr><td className={cellL + " w-32 font-semibold"}>Rujukan Kami</td><td className={cellL}>SAR/SU/MAT/{tahunAgm}/01</td></tr>
          <tr><td className={cellL + " font-semibold"}>Tarikh</td><td className={cellL}>{BLANK}</td></tr>
          <tr><td className={cellL + " font-semibold"}>Kepada</td><td className={cellL}>Semua Ahli Kariah Berdaftar, Surau Ar Raudhah</td></tr>
          <tr><td className={cellL + " font-semibold"}>Salinan</td><td className={cellL}>Nazir Surau · Semua AJK · Pejabat Agama Islam Daerah Hulu Langat</td></tr>
        </tbody></table>
        <p className="text-sm">Assalamualaikum warahmatullahi wabarakatuh.</p>
        <p className="mt-2 font-bold uppercase text-slate-900">Notis Mesyuarat Agung Tahunan Surau Ar Raudhah Tahun {tahunAgm}</p>
        <p className="mt-2 text-sm">Adalah dimaklumkan bahawa Mesyuarat Agung Tahunan akan diadakan pada <b>{agm.tarikh ?? BLANK}</b>{agm.masa ? `, ${agm.masa}` : ""}, bertempat di <b>{agm.tempat ?? BLANK}</b>.</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Mesyuarat membentangkan Laporan Setiausaha, Laporan Biro-Biro, Penyata Kewangan berakhir 31 Disember {thn} berserta Laporan Juruaudit Dalaman, serta usul untuk kelulusan ahli.</li>
          <li>Mesyuarat ini juga mesyuarat pemilihan AJK bagi penggal baharu — semua jawatan dikosongkan &amp; dipertandingkan semula.</li>
          <li>Hanya ahli berstatus <b>LULUS &amp; AKTIF</b> dalam e-Surau pada atau sebelum {BLANK} layak mengundi &amp; dicalonkan. Satu ahli satu undi; tiada proksi.</li>
          <li>Ahli belum berdaftar boleh daftar di arraudhahecomajestic.com atau kaunter sebelum mesyuarat.</li>
          <li>Borang pencalonan hendaklah dikemukakan kepada Setiausaha selewatnya {BLANK}. Pencalonan dari lantai hanya bagi jawatan tiada calon.</li>
          <li>Usul bertulis hendaklah dikemukakan selewatnya {BLANK}.</li>
          <li>Kuorum: minimum <b>{agm.kuorum || BLANK}</b> orang ahli layak mengundi. Jika tidak dicapai dalam 30 minit, mesyuarat ditangguh.</li>
        </ol>
        <p className="mt-3 text-sm">Sekian, terima kasih. <i>"Berkhidmat untuk Agama, Kariah dan Negara"</i>. Wassalam.</p>
        <div className="mt-6 text-sm text-slate-600">Saya yang menjalankan amanah,<br /><br />.................................................<br /><b>SYAHMI SELIMAN</b><br />Setiausaha, Surau Ar Raudhah, Eco Majestic</div>
      </Sec>

      {/* B6 LAPORAN SETIAUSAHA */}
      <Sec><H1 no={6} t="Laporan Setiausaha" />
        <H2 t="6.1 Pendahuluan" />
        <Teks k="laporan_setiausaha" fallback="(Sila jana Laporan Setiausaha di Naratif Laporan — pentadbiran, mesyuarat, aktiviti, pencapaian & cabaran.)" />

        <H2 t="6.2 Pentadbiran & Mesyuarat" />
        <table className="w-full border-collapse text-sm"><tbody>
          <Row2 k="Bilangan Ahli Jawatankuasa" v={`${jk.filter((j)=>["induk","ketua_biro","ajk_biasa"].includes(j.kumpulan)).length || BLANK} orang`} />
          <Row2 k="Bilangan biro aktif" v={`${biro.length || BLANK} biro`} />
          <Row2 k="Mesyuarat jawatankuasa diadakan" v={`${BLANK} kali`} />
          <Row2 k="Purata kehadiran mesyuarat" v={`${BLANK}%`} />
          <Row2 k="Petugas & staf surau" v={`${jk.filter((j)=>j.kumpulan==="staf").length || BLANK} orang`} />
        </tbody></table>

        <H2 t="6.3 Keahlian Ahli Kariah (dijana automatik)" />
        <table className="w-full border-collapse text-sm"><thead><tr><Th>Kategori</Th><Th>Bilangan</Th><Th>Peratus</Th></tr></thead><tbody>
          <Row3 k="Jumlah rekod dalam sistem" a={ahli.length} b="100%" bold />
          <Row3 k="Ahli diluluskan (LULUS)" a={lulus.length} b={pct(lulus.length, ahli.length)} />
          <Row3 k="Ahli aktif" a={aktif} b={pct(aktif, lulus.length)} />
          <Row3 k="Permohonan menunggu kelulusan" a={menunggu} b={pct(menunggu, ahli.length)} />
          <Row3 k="Tanggungan / isi rumah didaftarkan" a={bilTanggungan ?? BLANK} b="—" />
          <Row3 k={`Pendaftaran baharu ${thn}`} a={baru} b="—" />
        </tbody></table>
        <div className="mt-2 text-xs font-bold uppercase text-slate-500">Pecahan mengikut fasa</div>
        <table className="w-full border-collapse text-sm"><thead><tr><Th>Fasa</Th><Th>Bilangan</Th><Th>Peratus</Th></tr></thead><tbody>
          {ikutFasa.map((x) => <Row3 key={x.label} k={x.label} a={x.bil} b={pct(x.bil, lulus.length)} />)}
          <Row3 k="JUMLAH" a={lulus.length} b="100%" bold />
        </tbody></table>

        <H2 t="6.5 Sistem e-Surau" />
        <table className="w-full border-collapse text-sm"><thead><tr><Th>Modul</Th><Th>Fungsi</Th></tr></thead><tbody>
          {[["Keahlian Kariah","Pendaftaran dalam talian, semakan No. KP automatik, muat naik dokumen, tandatangan elektronik, portal ahli"],["Khairat Kematian","Pendaftaran skim, logik kelayakan tanggungan, tuntutan & pampasan"],["Kewangan Surau","Kutipan & perbelanjaan mengikut tabung, penyata, kawalan terbit oleh Bendahari"],["Ibadah & Program","Yassin & Tahlil, senarai program & RSVP"],["Sewaan Fasiliti","Tempahan dua peringkat, pengiraan kos, bayaran dalam talian"],["Portal Staf","Punch-in kehadiran, checklist tugas, pelaporan kerosakan"],["Sistem Gaji","Pengiraan gaji dari kehadiran & slip gaji"],["AGM & Pemilihan","QR daftar hadir, pencalonan, undian, buku laporan"],["Penajaan","Logo penaja & direktori Rakan Surau"],["Pembayaran Digital","Integrasi CHIP — FPX, kad & e-dompet"]].map((r,i)=>(<tr key={i}><td className={cellL+" w-40 font-semibold text-slate-700"}>{r[0]}</td><td className={cellL+" text-slate-600"}>{r[1]}</td></tr>))}
        </tbody></table>

        <H2 t="6.7 Cabaran" />
        <table className="w-full border-collapse text-sm"><thead><tr><Th>Cabaran</Th><Th>Kesan & Tindakan</Th></tr></thead><tbody>
          {[["Pendapatan bermusim, perbelanjaan tetap","Kutipan tinggi pada Ramadan; utiliti & emolumen berlaku setiap bulan. Tindakan: kukuhkan infaq langganan, sewaan & Rakan Surau."],["Kos program naik bila surau kawal mutu","Tindakan: kutipan penajaan, yuran vendor & booth secara berdisiplin."],[`Tunggakan yuran khairat`,`${khairatTunggak} ahli tertunggak. Tindakan: peringatan automatik & kempen kutipan berjadual.`],["Kebergantungan kepada individu","Tindakan: struktur biro diperkemas & tugasan didokumen dalam sistem."]].map((r,i)=>(<tr key={i}><td className={cellL+" w-1/3 font-semibold text-slate-700"}>{r[0]}</td><td className={cellL+" text-slate-600"}>{r[1]}</td></tr>))}
        </tbody></table>

        <H2 t="6.8 Penutup & Penghargaan" />
        <p className="text-sm leading-relaxed text-slate-700">Setiausaha merakamkan setinggi penghargaan kepada Nazir Surau, Pengerusi, seluruh AJK & ketua biro, imam & bilal, staf surau, para penaja & Rakan Surau, serta seluruh ahli kariah Eco Majestic. Segala kekurangan dipohon kemaafan.</p>
        <div className="mt-4 text-sm text-slate-600">.................................................<br /><b>SYAHMI SELIMAN</b> · Setiausaha</div>
      </Sec>

      {/* B7 BIRO */}
      <Sec><H1 no={7} t="Laporan Biro-Biro" />
        {biro.length === 0 ? <p className="text-sm text-slate-400 print-hide">(Belum ada biro)</p> : (
          <div className="space-y-4">{biro.map((b, i) => (
            <div key={i} className="break-inside-avoid rounded-lg border border-slate-200 p-3">
              <div className="font-bold text-slate-900">7.{i + 1} {b.nama}</div>
              <div className="mt-0.5 text-xs text-slate-500">{b.ketua ? `Ketua: ${b.ketua}` : ""}{b.setiausaha ? ` · SU: ${b.setiausaha}` : ""}</div>
              {b.ahli?.trim() && <div className="text-xs text-slate-500">Ahli: {b.ahli.split("\n").map((x: string) => x.trim()).filter(Boolean).join(", ")}</div>}
              {b.laporan?.trim() ? <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{b.laporan}</div> : <div className="mt-2 text-xs text-slate-400 print-hide">(Laporan belum diisi)</div>}
            </div>))}</div>)}
      </Sec>

      {/* B8 KEWANGAN */}
      <Sec><H1 no={8} t={`Laporan Penyata Kewangan Berakhir 31 Disember ${thn}`} />
        <H2 t="8.1 Penyata Pendapatan & Perbelanjaan (dijana automatik)" />
        <table className="w-full border-collapse text-sm"><thead><tr><Th>Pendapatan</Th><Th>{thn} (RM)</Th><Th>{thnL} (RM)</Th></tr></thead><tbody>
          {masuk25.map((s, i) => <tr key={s.label}><td className={cellL}>{s.label}</td><td className={cellR}>{s.jum ? rm(s.jum) : "—"}</td><td className={cellR}>{masuk24[i].jum ? rm(masuk24[i].jum) : "—"}</td></tr>)}
          <tr className="font-bold"><td className={cellL}>JUMLAH PENDAPATAN</td><td className={cellR}>{rm(tMasuk25)}</td><td className={cellR}>{rm(tMasuk24)}</td></tr>
        </tbody></table>
        <table className="mt-3 w-full border-collapse text-sm"><thead><tr><Th>Perbelanjaan</Th><Th>{thn} (RM)</Th><Th>{thnL} (RM)</Th></tr></thead><tbody>
          {keluar25.map((s, i) => <tr key={s.label}><td className={cellL}>{s.label}</td><td className={cellR}>{s.jum ? rm(s.jum) : "—"}</td><td className={cellR}>{keluar24[i].jum ? rm(keluar24[i].jum) : "—"}</td></tr>)}
          <tr className="font-bold"><td className={cellL}>JUMLAH PERBELANJAAN</td><td className={cellR}>{rm(tKeluar25)}</td><td className={cellR}>{rm(tKeluar24)}</td></tr>
          <tr className="font-bold"><td className={cellL}>LEBIHAN / (KURANGAN)</td><td className={cellR}>{rm(tMasuk25 - tKeluar25)}</td><td className={cellR}>{rm(tMasuk24 - tKeluar24)}</td></tr>
        </tbody></table>
        <p className="mt-1 text-[11px] text-slate-400">Angka dipetakan automatik dari kategori sistem (padanan kata kunci). Sila semak &amp; laras dengan Bendahari sebelum muktamad.</p>

        <H2 t="8.2 Penyata Kedudukan Kewangan (perlu isi Bendahari)" />
        <table className="w-full border-collapse text-sm"><tbody>
          {["Wang tunai di tangan","Wang di bank — akaun am","Wang di bank — akaun khairat","Simpanan tetap","Yuran belum diterima","Aset tetap (nilai buku)","JUMLAH ASET"].map((k)=>(<tr key={k}><td className={cellL+(k.startsWith("JUMLAH")?" font-bold":"")}>{k}</td><td className={cellR}>{BLANK}</td></tr>))}
        </tbody></table>

        <H2 t="8.3 Kedudukan Tabung (terimaan/bayaran dijana automatik)" />
        <table className="w-full border-collapse text-sm"><thead><tr><Th>Tabung</Th><Th>Baki 1 Jan</Th><Th>Terimaan {thn}</Th><Th>Bayaran {thn}</Th><Th>Baki 31 Dis</Th></tr></thead><tbody>
          <tr><td className={cellL}>Tabung Am</td><td className={cellR}>{BLANK}</td><td className={cellR}>{rm(tMasuk25 - masukKhairat(thn))}</td><td className={cellR}>{rm(tKeluar25 - keluarKhairat(thn))}</td><td className={cellR}>{BLANK}</td></tr>
          <tr><td className={cellL}>Tabung Khairat</td><td className={cellR}>{BLANK}</td><td className={cellR}>{rm(masukKhairat(thn))}</td><td className={cellR}>{rm(keluarKhairat(thn))}</td><td className={cellR}>{BLANK}</td></tr>
        </tbody></table>
        <p className="mt-1 text-[11px] text-slate-400">Baki pembukaan (1 Jan) perlu diisi Bendahari; baki penutup dikira selepas itu.</p>

        <H2 t="8.5 Perakuan Bendahari" />
        <p className="text-sm">Saya, {BLANK}, Bendahari Surau Ar Raudhah, mengesahkan penyata kewangan bagi tahun berakhir 31 Disember {thn} adalah benar &amp; lengkap pada pengetahuan saya.</p>
        <div className="mt-4 text-sm text-slate-500">................................................. · Tarikh: {BLANK}</div>

        <H2 t="8.6 Laporan Juruaudit Dalaman" />
        <table className="w-full border-collapse text-sm"><tbody>
          <tr><td className={cellL+" w-40 font-semibold"}>Skop semakan</td><td className={cellL}>Buku tunai · Resit · Baucar · Penyata bank · Rekod e-Surau</td></tr>
          <tr><td className={cellL+" font-semibold"}>Tarikh audit</td><td className={cellL}>{BLANK}</td></tr>
          <tr><td className={cellL+" font-semibold"}>Penemuan</td><td className={cellL}>{BLANK}</td></tr>
          <tr><td className={cellL+" font-semibold"}>Pengesahan</td><td className={cellL}>Pada pendapat kami, penyata kewangan {BLANK} menggambarkan kedudukan kewangan surau pada 31 Disember {thn}.</td></tr>
        </tbody></table>
        <div className="mt-4 flex gap-8 text-sm text-slate-500"><div>.....................<br />Juruaudit 1</div><div>.....................<br />Juruaudit 2</div></div>
      </Sec>

      {/* B9 USUL */}
      <Sec><H1 no={9} t="Pembentangan Usul / Cadangan" />
        <p className="mb-3 text-sm text-slate-600">Setiap usul memerlukan pencadang &amp; penyokong daripada ahli kariah yang layak mengundi.</p>
        {[
          "Bahawa Mesyuarat mengesahkan minit Mesyuarat Agung Tahunan yang lalu sebagai rekod yang benar.",
          "Bahawa Mesyuarat menerima Laporan Setiausaha sebagaimana Bahagian 6.",
          "Bahawa Mesyuarat menerima Laporan Biro-Biro sebagaimana Bahagian 7.",
          `Bahawa Mesyuarat menerima & mengesahkan Penyata Kewangan berakhir 31 Disember ${thn} berserta Laporan Juruaudit.`,
          "Bahawa Mesyuarat meluluskan cadangan belanjawan tahun hadapan berserta siling peruntukan biro.",
          "Bahawa Mesyuarat meluluskan had kuasa perbelanjaan Jawatankuasa.",
          "Bahawa Mesyuarat mengesahkan Dasar Kerjasama Pihak Luar & Penajaan sebagai dasar tetap surau.",
          "Bahawa Mesyuarat menetapkan kadar yuran & pampasan Skim Khairat Kematian.",
          "Bahawa Mesyuarat melantik dua juruaudit dalaman bagi tahun hadapan (bukan AJK, bukan penandatangan akaun).",
        ].map((t, i) => (
          <div key={i} className="mb-2 break-inside-avoid rounded-lg border border-slate-200 p-3 text-sm">
            <div className="font-semibold text-slate-900">Usul {i + 1}</div>
            <div className="mt-0.5 text-slate-700">{t}</div>
            <div className="mt-1 text-xs text-slate-500">Pencadang: .................. · Penyokong: .................. · Sokong ___ / Bantah ___ / Berkecuali ___ · ⬜ LULUS ⬜ TIDAK LULUS</div>
          </div>
        ))}
        <H2 t="Usul & Cadangan daripada Ahli Kariah" />
        {usul.length === 0 ? <p className="text-sm text-slate-400">Tiada usul ahli direkodkan. (Usul yang di-key di modul Usul &amp; Undian akan dipaparkan di sini.)</p> : (
          <div className="space-y-2">{usul.map((u, i) => (
            <div key={i} className="break-inside-avoid rounded-lg border border-slate-200 p-3 text-sm">
              <div className="font-semibold text-slate-900">Usul Ahli {u.no}: {u.tajuk}</div>
              {u.keterangan && <div className="mt-0.5 text-slate-600">{u.keterangan}</div>}
              <div className="mt-1 text-xs text-slate-600">{u.keputusan ? <>Keputusan: <b className="uppercase">{u.keputusan}</b> · Sokong {u.undi_setuju} / Bantah {u.undi_tolak} / Berkecuali {u.undi_berkecuali}</> : "Sokong ___ / Bantah ___ / Berkecuali ___ · ⬜ LULUS ⬜ TIDAK LULUS"}</div>
            </div>))}</div>)}
      </Sec>

      {/* LAMPIRAN */}
      <Sec><H1 no="Lampiran" t="Lampiran" />
        <table className="w-full border-collapse text-sm"><tbody>
          {[["A","Minit Mesyuarat Agung Tahunan yang lalu"],["B","Senarai penuh program & aktiviti sepanjang tempoh laporan"],["C","Statistik keahlian terperinci mengikut fasa"],["D","Senarai aset surau berserta keadaan & nilai"],["E","Dasar Kerjasama Pihak Luar & Penajaan"],["F","Cadangan Belanjawan tahun hadapan (terperinci)"],["G","Butiran transaksi kewangan (untuk semakan di kaunter)"]].map((r)=>(<tr key={r[0]} className="border-b border-slate-100"><td className="w-10 px-2 py-1 font-bold text-surau">{r[0]}</td><td className="px-2 py-1 text-slate-700">{r[1]}</td></tr>))}
        </tbody></table>
      </Sec>

      <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">{NAMA_SURAU} · Buku Laporan Tahunan {tahunAgm} · Khairat: aktif {khairatAktif}, tertunggak {khairatTunggak} · Program {thn}: {program.length} · Dijana {new Date().toLocaleDateString("ms-MY", { timeZone: "Asia/Kuala_Lumpur" })}</div>
    </div>
  );
}

function Row2({ k, v }: { k: string; v: string }) { return <tr className="border-b border-slate-100"><td className="py-1 text-slate-700">{k}</td><td className="py-1 text-right font-mono text-slate-800">{v}</td></tr>; }
function Row3({ k, a, b, bold }: { k: string; a: any; b: string; bold?: boolean }) { return <tr className={"border-b border-slate-100 " + (bold ? "font-bold text-slate-900" : "text-slate-700")}><td className="px-2 py-1">{k}</td><td className="px-2 py-1 text-right font-mono">{a}</td><td className="px-2 py-1 text-right font-mono">{b}</td></tr>; }
