import Link from "next/link";
import { getProfil, isPentadbir } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { NAMA_SURAU } from "@/lib/tetapan";
import { bukuDefaults } from "@/lib/bukuTeks";
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
// Turutan senarai JK (satu senarai, tiada tajuk kategori): induk → imam/bilal/siak → ajk → JK kira-kira

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

  const [teksRes, jkRes, biroRes, usulRes, ahliRes, tggRes, kutRes, belRes, khaRes, progRes, kewRes] = await Promise.all([
    db.from("agm_laporan_teks").select("kunci, nilai").eq("agm_id", agm.id),
    db.from("agm_jk").select("kumpulan, jawatan, nama, susunan").eq("agm_id", agm.id).order("susunan").order("dicipta"),
    db.from("agm_biro").select("nama, ketua, setiausaha, ahli, laporan, susunan").eq("agm_id", agm.id).order("susunan"),
    db.from("agm_usul").select("no, tajuk, keterangan, keputusan, undi_setuju, undi_tolak, undi_berkecuali").eq("agm_id", agm.id).order("no"),
    db.from("ahli_kariah").select("status, aktif, kawasan, tarikh_daftar, maklumat_disahkan, peringkat").limit(20000),
    db.from("tanggungan").select("id", { count: "exact", head: true }),
    db.from("kutipan").select("jumlah, tarikh, kategori:kategori_kutipan(nama, jenis_khairat)").gte("tarikh", dMula).lte("tarikh", dTamat).limit(40000),
    db.from("perbelanjaan").select("jumlah, tarikh, dari_khairat, kategori:kategori_belanja(nama)").eq("status", "dibayar").gte("tarikh", dMula).lte("tarikh", dTamat).limit(40000),
    db.from("keahlian_khairat").select("status").limit(20000),
    db.from("program").select("tarikh, dibuang_pada").is("dibuang_pada", null).gte("tarikh", `${thn}-01-01`).lte("tarikh", dTamat).limit(5000),
    db.from("agm_kewangan").select("bahagian, label, n1, n2, n3, n4, susunan").eq("agm_id", agm.id).order("susunan"),
  ]);

  const teks: Record<string, string> = {}; for (const r of ((teksRes.data as any[]) ?? [])) teks[r.kunci] = r.nilai ?? "";
  const jk = (jkRes.data as any[]) ?? [], biro = (biroRes.data as any[]) ?? [], usul = (usulRes.data as any[]) ?? [];
  const ahli = (ahliRes.data as any[]) ?? [], kutipan = (kutRes.data as any[]) ?? [], belanja = (belRes.data as any[]) ?? [];
  const khairat = (khaRes.data as any[]) ?? [], program = (progRes.data as any[]) ?? [];
  const bilTanggungan = (tggRes as any)?.count ?? null;
  const kew = (kewRes.data as any[]) ?? [];
  const kewOf = (b: string) => kew.filter((r) => r.bahagian === b);
  const kewAda = (b: string) => kewOf(b).length > 0;
  const kewJum = (b: string, f: "n1" | "n2") => kewOf(b).reduce((s, r) => s + n(r[f]), 0);

  // Keahlian
  const lulus = ahli.filter((a) => a.status === "lulus");
  const dahKemas = ahli.filter((a) => a.maklumat_disahkan).length;
  const belumKemas = ahli.filter((a) => !a.maklumat_disahkan).length;
  // Menunggu kelulusan sebenar: dah kemas kini, status menunggu, belum ditolak di mana-mana peringkat.
  const menunggu = ahli.filter((a) => a.maklumat_disahkan && a.status === "menunggu" && a.peringkat !== "ditolak_su" && a.peringkat !== "ditolak_nazir").length;
  const baru = ahli.filter((a) => String(a.tarikh_daftar ?? "").slice(0, 4) === String(thn)).length;
  const ikutFasa = Object.keys(KAWASAN).map((kod) => ({ label: KAWASAN[kod], bil: lulus.filter((a) => (a.kawasan ?? "lain") === kod).length })).filter((x) => x.bil > 0);
  const jkSorted = [...jk].sort((a, b) => n(a.susunan) - n(b.susunan));
  const biroNama = biro.map((b) => b.nama);
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
  // Baris paparan 8.1 — guna angka CSV Bendahari jika ada, jika tidak angka auto
  const pendRows = kewAda("pendapatan") ? kewOf("pendapatan").map((r) => ({ label: r.label, a: n(r.n1), b: n(r.n2) })) : masuk25.map((s, i) => ({ label: s.label, a: s.jum, b: masuk24[i].jum }));
  const belRows = kewAda("perbelanjaan") ? kewOf("perbelanjaan").map((r) => ({ label: r.label, a: n(r.n1), b: n(r.n2) })) : keluar25.map((s, i) => ({ label: s.label, a: s.jum, b: keluar24[i].jum }));
  const pendTot = kewAda("pendapatan") ? { a: kewJum("pendapatan", "n1"), b: kewJum("pendapatan", "n2") } : { a: tMasuk25, b: tMasuk24 };
  const belTot = kewAda("perbelanjaan") ? { a: kewJum("perbelanjaan", "n1"), b: kewJum("perbelanjaan", "n2") } : { a: tKeluar25, b: tKeluar24 };

  // ---- komponen ----
  const H1 = ({ no, t }: { no: number | string; t: string }) => (<div className="mb-4 mt-2 border-b-2 border-surau pb-1"><div className="text-xs font-semibold uppercase tracking-widest text-surau/70">{typeof no === "number" ? `Bahagian ${no}` : no}</div><h2 className="text-xl font-extrabold text-slate-900">{t}</h2></div>);
  const H2 = ({ t }: { t: string }) => <h3 className="mt-4 mb-1.5 font-bold text-slate-800">{t}</h3>;
  const DEF = bukuDefaults({ tahunAgm, thn, tarikh: agm.tarikh, masa: agm.masa, tempat: agm.tempat, kuorum: agm.kuorum });
  // Papar teks tersimpan; jika kosong guna teks lalai (sama seperti pra-isi editor "Isi Buku Laporan")
  const TeksD = ({ k }: { k: string }) => <div className="whitespace-pre-wrap text-justify text-sm leading-relaxed text-slate-800">{teks[k]?.trim() || DEF[k] || ""}</div>;
  const Sec = ({ children, pecah = true }: { children: React.ReactNode; pecah?: boolean }) => <section className={`mb-8 ${pecah ? "break-before-page" : ""}`}>{children}</section>;

  const cellR = "border border-slate-200 px-2 py-1 text-right font-mono";
  const cellL = "border border-slate-200 px-2 py-1";
  const Th = ({ children }: { children: React.ReactNode }) => <th className="border border-slate-300 bg-slate-50 px-2 py-1 text-left text-xs font-bold uppercase text-slate-600">{children}</th>;


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
      </Sec>

      {/* B1 KATA ALUAN */}
      <Sec><H1 no={1} t="Kata-Kata Aluan Pengerusi" />
        <TeksD k="kata_aluan_pengerusi" />
      </Sec>

      {/* B2 ATUR CARA */}
      <Sec><H1 no={2} t={`Atur Cara Mesyuarat Agung Tahun ${tahunAgm}`} />
        <TeksD k="atur_cara" />
      </Sec>

      {/* B3 AGENDA */}
      <Sec><H1 no={3} t={`Agenda Mesyuarat Agung Tahun ${tahunAgm}`} />
        <TeksD k="agenda" />
      </Sec>

      {/* B4 SENARAI JK */}
      <Sec><H1 no={4} t="Senarai Nama Jawatankuasa Surau Ar Raudhah" />
        {jkSorted.length === 0 ? <p className="text-sm text-slate-400 print-hide">(Belum ada — isi di Senarai JK &amp; Biro)</p> : (
          <table className="w-full border-collapse text-sm"><tbody>
            {jkSorted.map((j, i) => (<tr key={i} className="border-b border-slate-100"><td className="w-8 py-1 text-slate-400">{i + 1}.</td><td className="w-1/2 py-1 font-medium text-slate-700">{j.jawatan}</td><td className="py-1 text-slate-800">{j.nama}</td></tr>))}
          </tbody></table>)}
      </Sec>

      {/* B5 SURAT NOTIS */}
      <Sec><H1 no={5} t={`Surat Notis Mesyuarat Agung Tahun ${tahunAgm}`} />
        <TeksD k="surat_notis" />
      </Sec>

      {/* B6 LAPORAN SETIAUSAHA */}
      <Sec><H1 no={6} t="Laporan Setiausaha" />
        <H2 t="6.1 Pendahuluan" />
        <TeksD k="laporan_setiausaha" />

        <H2 t="6.2 Pentadbiran & Mesyuarat" />
        <table className="w-full border-collapse text-sm"><tbody>
          <Row2 k="Bilangan Ahli Jawatankuasa" v={`${jk.filter((j)=>["induk","ketua_biro","ajk_biasa"].includes(j.kumpulan)).length || BLANK} orang`} />
          <Row2 k="Juruaudit dalaman" v={`${jk.filter((j)=>j.kumpulan==="juruaudit").length || BLANK} orang`} />
          <Row2 k="Bilangan biro aktif" v={`${biro.length || BLANK} biro`} />
          <Row2 k="Mesyuarat jawatankuasa diadakan" v={`${BLANK} kali`} />
          <Row2 k="Purata kehadiran mesyuarat" v={`${BLANK}%`} />
          <Row2 k="Petugas & staf surau" v={`${jk.filter((j)=>j.kumpulan==="staf").length || BLANK} orang`} />
        </tbody></table>

        <H2 t="6.3 Keahlian Ahli Kariah" />
        <table className="w-full border-collapse text-sm"><thead><tr><Th>Kategori</Th><Th>Bilangan</Th><Th>Peratus</Th></tr></thead><tbody>
          <Row3 k="Jumlah rekod dalam sistem" a={ahli.length} b="100%" bold />
          <Row3 k="Ahli diluluskan (LULUS)" a={lulus.length} b={pct(lulus.length, ahli.length)} />
          <Row3 k="Telah dikemaskini" a={dahKemas} b={pct(dahKemas, ahli.length)} />
          <Row3 k="Belum dikemaskini" a={belumKemas} b={pct(belumKemas, ahli.length)} />
          <Row3 k="Menunggu kelulusan" a={menunggu} b={pct(menunggu, ahli.length)} />
          <Row3 k="Tanggungan / isi rumah didaftarkan" a={bilTanggungan ?? BLANK} b="—" />
          <Row3 k={`Pendaftaran baharu ${thn}`} a={baru} b="—" />
        </tbody></table>
        <div className="mt-2 text-xs font-bold uppercase text-slate-500">Pecahan mengikut fasa</div>
        <table className="w-full border-collapse text-sm"><thead><tr><Th>Fasa</Th><Th>Bilangan</Th><Th>Peratus</Th></tr></thead><tbody>
          {ikutFasa.map((x) => <Row3 key={x.label} k={x.label} a={x.bil} b={pct(x.bil, lulus.length)} />)}
          <Row3 k="JUMLAH" a={lulus.length} b="100%" bold />
        </tbody></table>

        <H2 t="6.4 Sistem e-Surau" />
        <TeksD k="modul_esurau" />

        <H2 t="6.5 Cabaran" />
        <TeksD k="su_cabaran" />

        <H2 t="6.6 Penutup & Penghargaan" />
        <TeksD k="su_penghargaan" />
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
              {b.laporan?.trim() ? <div className="mt-2 whitespace-pre-wrap text-justify text-sm leading-relaxed">{b.laporan}</div> : <div className="mt-2 text-xs text-slate-400 print-hide">(Laporan belum diisi)</div>}
            </div>))}</div>)}
      </Sec>

      {/* B8 KEWANGAN */}
      <Sec><H1 no={8} t={`Laporan Penyata Kewangan Berakhir 31 Disember ${thn}`} />
        <H2 t="8.1 Penyata Pendapatan & Perbelanjaan" />
        <table className="w-full border-collapse text-sm"><thead><tr><Th>Pendapatan</Th><Th>{thn} (RM)</Th><Th>{thnL} (RM)</Th></tr></thead><tbody>
          {pendRows.map((s, i) => <tr key={i}><td className={cellL}>{s.label}</td><td className={cellR}>{s.a ? rm(s.a) : "—"}</td><td className={cellR}>{s.b ? rm(s.b) : "—"}</td></tr>)}
          <tr className="font-bold"><td className={cellL}>JUMLAH PENDAPATAN</td><td className={cellR}>{rm(pendTot.a)}</td><td className={cellR}>{rm(pendTot.b)}</td></tr>
        </tbody></table>
        <table className="mt-3 w-full border-collapse text-sm"><thead><tr><Th>Perbelanjaan</Th><Th>{thn} (RM)</Th><Th>{thnL} (RM)</Th></tr></thead><tbody>
          {belRows.map((s, i) => <tr key={i}><td className={cellL}>{s.label}</td><td className={cellR}>{s.a ? rm(s.a) : "—"}</td><td className={cellR}>{s.b ? rm(s.b) : "—"}</td></tr>)}
          <tr className="font-bold"><td className={cellL}>JUMLAH PERBELANJAAN</td><td className={cellR}>{rm(belTot.a)}</td><td className={cellR}>{rm(belTot.b)}</td></tr>
          <tr className="font-bold"><td className={cellL}>LEBIHAN / (KURANGAN)</td><td className={cellR}>{rm(pendTot.a - belTot.a)}</td><td className={cellR}>{rm(pendTot.b - belTot.b)}</td></tr>
        </tbody></table>
        <div className="mt-3"><div className="mb-1 text-xs font-bold uppercase text-slate-500">Ulasan Bendahari</div><TeksD k="ulasan_kewangan" /></div>

        <H2 t="8.2 Penyata Kedudukan Kewangan" />
        {kewAda("aset") || kewAda("liabiliti") ? (
          <table className="w-full border-collapse text-sm"><thead><tr><Th>Perkara</Th><Th>{thn} (RM)</Th><Th>{thnL} (RM)</Th></tr></thead><tbody>
            {kewOf("aset").map((r, i) => <tr key={"a" + i}><td className={cellL}>{r.label}</td><td className={cellR}>{rm(n(r.n1))}</td><td className={cellR}>{rm(n(r.n2))}</td></tr>)}
            <tr className="font-bold"><td className={cellL}>JUMLAH ASET</td><td className={cellR}>{rm(kewJum("aset", "n1"))}</td><td className={cellR}>{rm(kewJum("aset", "n2"))}</td></tr>
            {kewOf("liabiliti").map((r, i) => <tr key={"l" + i}><td className={cellL}>{r.label}</td><td className={cellR}>{rm(n(r.n1))}</td><td className={cellR}>{rm(n(r.n2))}</td></tr>)}
            <tr className="font-bold"><td className={cellL}>JUMLAH LIABILITI</td><td className={cellR}>{rm(kewJum("liabiliti", "n1"))}</td><td className={cellR}>{rm(kewJum("liabiliti", "n2"))}</td></tr>
            <tr className="font-bold"><td className={cellL}>ASET BERSIH</td><td className={cellR}>{rm(kewJum("aset", "n1") - kewJum("liabiliti", "n1"))}</td><td className={cellR}>{rm(kewJum("aset", "n2") - kewJum("liabiliti", "n2"))}</td></tr>
          </tbody></table>
        ) : (
          <table className="w-full border-collapse text-sm"><tbody>
            {["Wang tunai di tangan","Wang di bank — akaun am","Wang di bank — akaun khairat","Simpanan tetap","Yuran belum diterima","Aset tetap (nilai buku)","JUMLAH ASET"].map((k)=>(<tr key={k}><td className={cellL+(k.startsWith("JUMLAH")?" font-bold":"")}>{k}</td><td className={cellR}>{BLANK}</td></tr>))}
          </tbody></table>)}

        <H2 t="8.3 Kedudukan Tabung" />
        {kewAda("tabung") ? (
          <table className="w-full border-collapse text-sm"><thead><tr><Th>Tabung</Th><Th>Baki 1 Jan</Th><Th>Terimaan</Th><Th>Bayaran</Th><Th>Baki 31 Dis</Th></tr></thead><tbody>
            {kewOf("tabung").map((r, i) => <tr key={i}><td className={cellL}>{r.label}</td><td className={cellR}>{rm(n(r.n1))}</td><td className={cellR}>{rm(n(r.n2))}</td><td className={cellR}>{rm(n(r.n3))}</td><td className={cellR}>{rm(n(r.n4))}</td></tr>)}
          </tbody></table>
        ) : (
          <table className="w-full border-collapse text-sm"><thead><tr><Th>Tabung</Th><Th>Baki 1 Jan</Th><Th>Terimaan {thn}</Th><Th>Bayaran {thn}</Th><Th>Baki 31 Dis</Th></tr></thead><tbody>
            <tr><td className={cellL}>Tabung Am</td><td className={cellR}>{BLANK}</td><td className={cellR}>{rm(tMasuk25 - masukKhairat(thn))}</td><td className={cellR}>{rm(tKeluar25 - keluarKhairat(thn))}</td><td className={cellR}>{BLANK}</td></tr>
            <tr><td className={cellL}>Tabung Khairat</td><td className={cellR}>{BLANK}</td><td className={cellR}>{rm(masukKhairat(thn))}</td><td className={cellR}>{rm(keluarKhairat(thn))}</td><td className={cellR}>{BLANK}</td></tr>
          </tbody></table>)}

        <H2 t="8.4 Nota kepada Penyata Kewangan" />
        <TeksD k="nota_kewangan" />

        <H2 t="8.5 Perakuan Bendahari" />
        <TeksD k="perakuan_bendahari" />
        <div className="mt-4 text-sm text-slate-500">................................................. · Tarikh: {BLANK}</div>

        <H2 t="8.6 Laporan Juruaudit Dalaman" />
        <TeksD k="laporan_juruaudit" />
        <div className="mt-4 flex gap-8 text-sm text-slate-500"><div>.....................<br />Juruaudit 1</div><div>.....................<br />Juruaudit 2</div></div>
      </Sec>

      {/* B9 USUL */}
      <Sec><H1 no={9} t="Pembentangan Usul / Cadangan" />
        <p className="mb-3 text-sm text-slate-600">Setiap usul memerlukan pencadang &amp; penyokong daripada ahli kariah yang layak mengundi.</p>
        <TeksD k="usul_standard" />
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
