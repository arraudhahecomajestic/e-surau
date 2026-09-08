import Link from "next/link";
import { getProfil, isPentadbir } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { NAMA_SURAU } from "@/lib/tetapan";
import ButangCetak from "@/components/ButangCetak";

export const dynamic = "force-dynamic";

const n = (x: any) => Number(x) || 0;
const rm = (v: number) => "RM " + v.toLocaleString("ms-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) + "%" : "—");
const BLANK = "[__________]";

const KAWASAN: Record<string, string> = {
  cradleton: "Cradleton", tenderfield: "Tenderfield", stoneridge: "Stoneridge",
  mellowood: "Mellowood", merrydale: "Merrydale", cheerywood: "Cheerywood",
  karisma: "Apartment Karisma", harmoni: "Apartment Harmoni", simfoni: "Apartment Simfoni", lain: "Lain-lain",
};
const KUMP_JK: { kod: string; label: string }[] = [
  { kod: "penaung", label: "Penaung & Penasihat" },
  { kod: "induk", label: "Jawatankuasa Induk" },
  { kod: "ketua_biro", label: "Ketua Biro" },
  { kod: "ajk_biasa", label: "Ahli Jawatankuasa Biasa" },
  { kod: "juruaudit", label: "Juruaudit Dalaman" },
  { kod: "staf", label: "Petugas & Staf Surau" },
];

export default async function BukuLaporanPage({ searchParams }: { searchParams?: { tahun?: string } }) {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isPentadbir(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const { data: agmRows } = await db.from("agm").select("*").order("tahun", { ascending: false }).order("dicipta", { ascending: false }).limit(1);
  const agm = (agmRows as any[])?.[0] ?? null;
  if (!agm) {
    return <div className="mx-auto max-w-3xl"><Link href="/admin/agm" className="text-sm text-surau hover:underline">← Kembali ke AGM</Link><div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Sila cipta maklumat AGM dahulu.</div></div>;
  }

  const tahunAgm = agm.tahun ?? new Date().getFullYear();
  const tahunKira = Number(searchParams?.tahun) || (tahunAgm - 1);
  const mula = `${tahunKira}-01-01`, tamat = `${tahunKira}-12-31`;

  const [teksRes, jkRes, biroRes, usulRes, ahliRes, kutipanRes, belanjaRes, khairatRes, programRes] = await Promise.all([
    db.from("agm_laporan_teks").select("kunci, nilai").eq("agm_id", agm.id),
    db.from("agm_jk").select("kumpulan, jawatan, nama, biro, susunan").eq("agm_id", agm.id).order("kumpulan").order("susunan"),
    db.from("agm_biro").select("nama, ketua, setiausaha, ahli, laporan, susunan").eq("agm_id", agm.id).order("susunan"),
    db.from("agm_usul").select("no, tajuk, keterangan, keputusan, undi_setuju, undi_tolak, undi_berkecuali").eq("agm_id", agm.id).order("no"),
    db.from("ahli_kariah").select("status, aktif, kawasan, tarikh_daftar").limit(20000),
    db.from("kutipan").select("jumlah, kategori:kategori_kutipan(nama, jenis_khairat)").gte("tarikh", mula).lte("tarikh", tamat).limit(20000),
    db.from("perbelanjaan").select("jumlah, dari_khairat, kategori:kategori_belanja(nama)").eq("status", "dibayar").gte("tarikh", mula).lte("tarikh", tamat).limit(20000),
    db.from("keahlian_khairat").select("status").limit(20000),
    db.from("program").select("tarikh, dibuang_pada").is("dibuang_pada", null).gte("tarikh", mula).lte("tarikh", tamat).limit(5000),
  ]);

  const teks: Record<string, string> = {};
  for (const r of ((teksRes.data as any[]) ?? [])) teks[r.kunci] = r.nilai ?? "";
  const jk = (jkRes.data as any[]) ?? [];
  const biro = (biroRes.data as any[]) ?? [];
  const usul = (usulRes.data as any[]) ?? [];
  const ahli = (ahliRes.data as any[]) ?? [];
  const kutipan = (kutipanRes.data as any[]) ?? [];
  const belanja = (belanjaRes.data as any[]) ?? [];
  const khairat = (khairatRes.data as any[]) ?? [];
  const program = (programRes.data as any[]) ?? [];

  // Keahlian
  const lulus = ahli.filter((a) => a.status === "lulus");
  const aktif = lulus.filter((a) => a.aktif).length;
  const menunggu = ahli.filter((a) => a.status === "menunggu").length;
  const baru = ahli.filter((a) => String(a.tarikh_daftar ?? "").slice(0, 4) === String(tahunKira)).length;
  const ikutFasa = Object.keys(KAWASAN).map((kod) => ({ label: KAWASAN[kod], bil: lulus.filter((a) => (a.kawasan ?? "lain") === kod).length })).filter((x) => x.bil > 0);
  // Kewangan
  const totalMasuk = kutipan.reduce((s, k) => s + n(k.jumlah), 0);
  const totalKeluar = belanja.reduce((s, b) => s + n(b.jumlah), 0);
  const masukKhairat = kutipan.filter((k) => k.kategori?.jenis_khairat).reduce((s, k) => s + n(k.jumlah), 0);
  const keluarKhairat = belanja.filter((b) => b.dari_khairat).reduce((s, b) => s + n(b.jumlah), 0);
  const ikutKat = (arr: any[]) => { const m = new Map<string, number>(); for (const x of arr) { const nm = x.kategori?.nama ?? "Lain-lain"; m.set(nm, (m.get(nm) ?? 0) + n(x.jumlah)); } return [...m.entries()].map(([nama, jum]) => ({ nama, jum })).sort((a, b) => b.jum - a.jum); };
  const masukKat = ikutKat(kutipan), keluarKat = ikutKat(belanja);
  const khairatAktif = khairat.filter((k) => k.status === "aktif").length;
  const khairatTunggak = khairat.filter((k) => k.status === "tertunggak").length;

  // ---- Helper komponen ----
  const H1 = ({ no, t }: { no: number; t: string }) => (
    <div className="mb-4 mt-2 border-b-2 border-surau pb-1"><div className="text-xs font-semibold uppercase tracking-widest text-surau/70">Bahagian {no}</div><h2 className="text-xl font-extrabold text-slate-900">{t}</h2></div>
  );
  const H2 = ({ t }: { t: string }) => <h3 className="mt-4 mb-1.5 font-bold text-slate-800">{t}</h3>;
  const Teks = ({ k, fallback }: { k: string; fallback?: string }) => teks[k]?.trim()
    ? <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{teks[k]}</div>
    : fallback
      ? <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-500">{fallback}</div>
      : <div className="rounded border border-dashed border-slate-300 p-2 text-xs text-slate-400 print-hide">(Belum diisi — isi di Naratif Laporan)</div>;
  const Sec = ({ children, pecah = true }: { children: React.ReactNode; pecah?: boolean }) => (
    <section className={`mb-8 ${pecah ? "break-before-page" : ""}`}>{children}</section>
  );

  return (
    <div className="mx-auto max-w-3xl text-slate-800">
      <div className="print-hide mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/agm" className="text-sm text-surau hover:underline">← Kembali ke AGM</Link>
        <div className="flex items-center gap-2"><span className="text-xs text-slate-500">Kewangan: {tahunKira}</span><ButangCetak label="Cetak / PDF" /></div>
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
        <H1 no={0} t="Isi Kandungan" />
        <ol className="list-decimal space-y-1 pl-6 text-sm">
          <li>Kata-Kata Aluan Pengerusi</li>
          <li>Atur Cara Mesyuarat Agung Tahun {tahunAgm}</li>
          <li>Agenda Mesyuarat Agung Tahun {tahunAgm}</li>
          <li>Senarai Nama Jawatankuasa Surau Ar Raudhah</li>
          <li>Surat Notis Mesyuarat Agung Tahun {tahunAgm}</li>
          <li>Laporan Setiausaha</li>
          <li>Laporan Biro-Biro</li>
          <li>Laporan Penyata Kewangan Berakhir 31 Disember {tahunKira}</li>
          <li>Pembentangan Usul / Cadangan</li>
        </ol>
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500"><b>Nota Penyediaan:</b> Buku ini disediakan oleh Setiausaha untuk edaran kepada ahli kariah. Ruangan bertanda {BLANK} hendaklah diisi dengan maklumat sebenar sebelum dicetak. Angka keahlian &amp; kewangan dijana automatik dari sistem e-Surau.</p>
      </Sec>

      {/* B1 KATA ALUAN */}
      <Sec>
        <H1 no={1} t="Kata-Kata Aluan Pengerusi" />
        <Teks k="kata_aluan_pengerusi" fallback={"Assalamualaikum warahmatullahi wabarakatuh.\n\nAlhamdulillah, bersyukur ke hadrat Allah SWT kerana dengan limpah kurnia-Nya kita dapat bertemu dalam Mesyuarat Agung Tahunan Surau Ar Raudhah bagi tahun " + tahunAgm + ". (Sila jana teks penuh di Naratif Laporan — butang Bantu tulis AI.)"} />
      </Sec>

      {/* B2 ATUR CARA */}
      <Sec>
        <H1 no={2} t={`Atur Cara Mesyuarat Agung Tahun ${tahunAgm}`} />
        {agm.atur_cara?.trim()
          ? <div className="whitespace-pre-wrap text-sm leading-relaxed">{agm.atur_cara}</div>
          : <div className="rounded border border-dashed border-slate-300 p-2 text-xs text-slate-400 print-hide">(Isi di Maklumat Mesyuarat → Atur Cara / Nota)</div>}
      </Sec>

      {/* B3 AGENDA */}
      <Sec>
        <H1 no={3} t={`Agenda Mesyuarat Agung Tahun ${tahunAgm}`} />
        <Teks k="agenda" fallback={"1.0 Ucapan Pengerusi\n2.0 Pengesahan Minit Mesyuarat Agung yang lalu\n3.0 Perkara Berbangkit\n4.0 Pembentangan Laporan Setiausaha\n5.0 Pembentangan Program & Laporan Biro\n6.0 Pembentangan Belanjawan\n7.0 Laporan Kewangan Tahun " + tahunKira + " & Laporan Juruaudit\n8.0 Sesi Soal Jawab\n9.0 Pembentangan Usul & Cadangan\n10.0 Perletakan Jawatan & Pembubaran Jawatankuasa\n11.0 Pemilihan Ahli Jawatankuasa\n12.0 Hal-Hal Lain\n13.0 Penangguhan Mesyuarat"} />
      </Sec>

      {/* B4 SENARAI JK */}
      <Sec>
        <H1 no={4} t="Senarai Nama Jawatankuasa Surau Ar Raudhah" />
        {jk.length === 0 ? <p className="text-sm text-slate-400 print-hide">(Belum ada — isi di Senarai JK &amp; Biro)</p> : (
          <div className="space-y-4">
            {KUMP_JK.filter((k) => jk.some((j) => j.kumpulan === k.kod)).map((k) => (
              <div key={k.kod} className="break-inside-avoid">
                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-surau">{k.label}</div>
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {jk.filter((j) => j.kumpulan === k.kod).map((j, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="w-8 py-1 text-slate-400">{i + 1}.</td>
                        <td className="py-1 font-medium text-slate-700">{j.jawatan}</td>
                        <td className="py-1 text-slate-800">{j.nama}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-slate-400">Rekod kehadiran mesyuarat jawatankuasa: {BLANK} (isi manual jika perlu).</p>
      </Sec>

      {/* B5 SURAT NOTIS */}
      <Sec>
        <H1 no={5} t={`Surat Notis Mesyuarat Agung Tahun ${tahunAgm}`} />
        <Teks k="surat_notis" fallback={"NOTIS MESYUARAT AGUNG TAHUNAN SURAU AR RAUDHAH TAHUN " + tahunAgm + "\n\nAdalah dimaklumkan bahawa Mesyuarat Agung Tahunan akan diadakan pada " + (agm.tarikh ?? BLANK) + (agm.masa ? ", " + agm.masa : "") + " bertempat di " + (agm.tempat ?? BLANK) + ". (Sila jana teks penuh di Naratif Laporan.)"} />
      </Sec>

      {/* B6 LAPORAN SETIAUSAHA */}
      <Sec>
        <H1 no={6} t="Laporan Setiausaha" />
        <H2 t="6.1 Pendahuluan & Pentadbiran" />
        <Teks k="laporan_setiausaha" fallback="(Sila jana Laporan Setiausaha di Naratif Laporan — merangkumi pentadbiran, mesyuarat, aktiviti, pencapaian & cabaran.)" />

        <H2 t="6.3 Keahlian Ahli Kariah (dijana automatik)" />
        <table className="w-full border-collapse text-sm">
          <tbody>
            <Row k="Jumlah ahli diluluskan (LULUS)" v={String(lulus.length)} bold />
            <Row k="Ahli aktif" v={`${aktif} (${pct(aktif, lulus.length)})`} />
            <Row k="Permohonan menunggu kelulusan" v={String(menunggu)} />
            <Row k={`Pendaftaran baharu ${tahunKira}`} v={String(baru)} />
          </tbody>
        </table>
        <div className="mt-2 text-xs font-bold uppercase text-slate-500">Pecahan mengikut fasa</div>
        <table className="w-full border-collapse text-sm">
          <tbody>
            {ikutFasa.map((x) => <Row key={x.label} k={x.label} v={`${x.bil} (${pct(x.bil, lulus.length)})`} />)}
          </tbody>
        </table>

        <H2 t="6.5 Sistem e-Surau" />
        <p className="text-sm leading-relaxed">Sistem e-Surau (arraudhahecomajestic.com) telah berkembang daripada portal pendaftaran ahli kepada sistem pengurusan surau yang lengkap: keahlian &amp; khairat, kewangan mengikut tabung, ibadah &amp; program, sewaan fasiliti, portal staf &amp; gaji, penajaan, infaq, AGM &amp; pemilihan, dan pembayaran digital. Nilai utama: telus, selamat (mematuhi APDP 2010) dan berterusan.</p>

        <H2 t="6.7 Cabaran & 6.8 Penghargaan" />
        <Teks k="ulasan_kewangan" fallback="(Cabaran & penghargaan boleh dimasukkan dalam Laporan Setiausaha di Naratif Laporan.)" />
      </Sec>

      {/* B7 LAPORAN BIRO */}
      <Sec>
        <H1 no={7} t="Laporan Biro-Biro" />
        {biro.length === 0 ? <p className="text-sm text-slate-400 print-hide">(Belum ada biro)</p> : (
          <div className="space-y-4">
            {biro.map((b, i) => (
              <div key={i} className="break-inside-avoid rounded-lg border border-slate-200 p-3">
                <div className="font-bold text-slate-900">7.{i + 1} {b.nama}</div>
                <div className="mt-0.5 text-xs text-slate-500">{b.ketua ? `Ketua: ${b.ketua}` : ""}{b.setiausaha ? ` · SU: ${b.setiausaha}` : ""}</div>
                {b.ahli?.trim() && <div className="text-xs text-slate-500">Ahli: {b.ahli.split("\n").map((x: string) => x.trim()).filter(Boolean).join(", ")}</div>}
                {b.laporan?.trim() ? <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{b.laporan}</div> : <div className="mt-2 text-xs text-slate-400 print-hide">(Laporan belum diisi — ketua biro isi di Senarai JK &amp; Biro)</div>}
              </div>
            ))}
          </div>
        )}
      </Sec>

      {/* B8 PENYATA KEWANGAN */}
      <Sec>
        <H1 no={8} t={`Laporan Penyata Kewangan Berakhir 31 Disember ${tahunKira}`} />
        <H2 t="8.1 Penyata Pendapatan & Perbelanjaan (dijana automatik)" />
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr><td colSpan={2} className="pt-1 text-xs font-bold uppercase text-slate-500">Pendapatan</td></tr>
            {masukKat.map((x) => <Row key={x.nama} k={x.nama} v={rm(x.jum)} />)}
            <Row k="JUMLAH PENDAPATAN" v={rm(totalMasuk)} bold />
            <tr><td colSpan={2} className="pt-2 text-xs font-bold uppercase text-slate-500">Perbelanjaan</td></tr>
            {keluarKat.map((x) => <Row key={x.nama} k={x.nama} v={rm(x.jum)} />)}
            <Row k="JUMLAH PERBELANJAAN" v={rm(totalKeluar)} bold />
            <tr><td className="border-t-2 border-slate-300 pt-1 font-bold">LEBIHAN / (KURANGAN) TAHUN</td><td className="border-t-2 border-slate-300 pt-1 text-right font-mono font-bold">{rm(totalMasuk - totalKeluar)}</td></tr>
          </tbody>
        </table>
        <p className="mt-1 text-[11px] text-slate-400">Termasuk Tabung Am &amp; Khairat. Tabung Khairat: pendapatan {rm(masukKhairat)} · perbelanjaan {rm(keluarKhairat)}. Perbandingan {tahunKira - 1}, Penyata Kedudukan (aset/liabiliti) &amp; pergerakan baki tabung: {BLANK} (isi oleh Bendahari).</p>

        <H2 t="8.5 Perakuan Bendahari" />
        <p className="text-sm">Saya, {BLANK}, Bendahari Surau Ar Raudhah, mengesahkan penyata kewangan bagi tahun berakhir 31 Disember {tahunKira} adalah benar dan lengkap pada pengetahuan saya.</p>
        <div className="mt-6 text-sm text-slate-500">.................................................<br />Bendahari · Tarikh: {BLANK}</div>

        <H2 t="8.6 Laporan Juruaudit Dalaman" />
        <p className="text-sm text-slate-500">Semakan oleh juruaudit dalaman yang dilantik. Penemuan &amp; pengesahan: {BLANK}.</p>
      </Sec>

      {/* B9 USUL */}
      <Sec>
        <H1 no={9} t="Pembentangan Usul / Cadangan" />
        {usul.length === 0 ? <p className="text-sm text-slate-400 print-hide">(Belum ada usul — isi di Usul &amp; Undian)</p> : (
          <div className="space-y-3">
            {usul.map((u, i) => (
              <div key={i} className="break-inside-avoid rounded-lg border border-slate-200 p-3">
                <div className="font-semibold text-slate-900">Usul {u.no}: {u.tajuk}</div>
                {u.keterangan && <div className="mt-0.5 text-sm text-slate-600">{u.keterangan}</div>}
                <div className="mt-1 text-xs text-slate-500">Pencadang: .................. · Penyokong: ..................</div>
                <div className="mt-1 text-xs text-slate-600">{u.keputusan ? <>Keputusan: <b className="uppercase">{u.keputusan}</b> · Sokong {u.undi_setuju} / Bantah {u.undi_tolak} / Berkecuali {u.undi_berkecuali}</> : "Sokong: ....  Bantah: ....  Berkecuali: ....   ⬜ LULUS  ⬜ TIDAK LULUS"}</div>
              </div>
            ))}
          </div>
        )}
      </Sec>

      <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        {NAMA_SURAU} · Buku Laporan Tahunan {tahunAgm} · Khairat: aktif {khairatAktif}, tertunggak {khairatTunggak} · Program {tahunKira}: {program.length} · Dijana {new Date().toLocaleDateString("ms-MY", { timeZone: "Asia/Kuala_Lumpur" })}
      </div>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return <tr className="border-b border-slate-100"><td className={`py-1 ${bold ? "font-bold text-slate-900" : "text-slate-700"}`}>{k}</td><td className={`py-1 text-right font-mono ${bold ? "font-bold text-slate-900" : "text-slate-700"}`}>{v}</td></tr>;
}
