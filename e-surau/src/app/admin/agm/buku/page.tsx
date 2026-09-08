import Link from "next/link";
import { getProfil, isPentadbir } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { NAMA_SURAU } from "@/lib/tetapan";
import ButangCetak from "@/components/ButangCetak";

export const dynamic = "force-dynamic";

const n = (x: any) => Number(x) || 0;
const rm = (v: number) => "RM " + v.toLocaleString("ms-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
  const tahunKira = Number(searchParams?.tahun) || (tahunAgm - 1); // penyata kewangan = tahun berakhir
  const mula = `${tahunKira}-01-01`, tamat = `${tahunKira}-12-31`;

  const [teksRes, jkRes, biroRes, usulRes, kutipanRes, belanjaRes] = await Promise.all([
    db.from("agm_laporan_teks").select("kunci, nilai").eq("agm_id", agm.id),
    db.from("agm_jk").select("kumpulan, jawatan, nama, biro").eq("agm_id", agm.id).order("kumpulan").order("susunan"),
    db.from("agm_biro").select("nama, ketua, setiausaha, ahli, laporan, susunan").eq("agm_id", agm.id).order("susunan"),
    db.from("agm_usul").select("no, tajuk, keterangan, keputusan, undi_setuju, undi_tolak, undi_berkecuali").eq("agm_id", agm.id).order("no"),
    db.from("kutipan").select("jumlah, kategori:kategori_kutipan(nama, jenis_khairat)").gte("tarikh", mula).lte("tarikh", tamat).limit(20000),
    db.from("perbelanjaan").select("jumlah, dari_khairat, kategori:kategori_belanja(nama)").eq("status", "dibayar").gte("tarikh", mula).lte("tarikh", tamat).limit(20000),
  ]);

  const teks: Record<string, string> = {};
  for (const r of ((teksRes.data as any[]) ?? [])) teks[r.kunci] = r.nilai ?? "";
  const jk = (jkRes.data as any[]) ?? [];
  const biro = (biroRes.data as any[]) ?? [];
  const usul = (usulRes.data as any[]) ?? [];
  const kutipan = (kutipanRes.data as any[]) ?? [];
  const belanja = (belanjaRes.data as any[]) ?? [];

  const totalMasuk = kutipan.reduce((s, k) => s + n(k.jumlah), 0);
  const totalKeluar = belanja.reduce((s, b) => s + n(b.jumlah), 0);
  const masukKhairat = kutipan.filter((k) => k.kategori?.jenis_khairat).reduce((s, k) => s + n(k.jumlah), 0);
  const keluarKhairat = belanja.filter((b) => b.dari_khairat).reduce((s, b) => s + n(b.jumlah), 0);
  const ikutKat = (arr: any[]) => { const m = new Map<string, number>(); for (const x of arr) { const nm = x.kategori?.nama ?? "Lain-lain"; m.set(nm, (m.get(nm) ?? 0) + n(x.jumlah)); } return [...m.entries()].map(([nama, jum]) => ({ nama, jum })).sort((a, b) => b.jum - a.jum); };
  const masukKat = ikutKat(kutipan), keluarKat = ikutKat(belanja);

  const Teks = ({ k }: { k: string }) => teks[k]?.trim()
    ? <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{teks[k]}</div>
    : <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-400 print-hide">(Belum diisi — isi di <b>Naratif Laporan</b>)</div>;

  const Baris = ({ k, v, tebal }: { k: string; v: string; tebal?: boolean }) => (
    <div className={`flex items-center justify-between py-1 text-sm ${tebal ? "font-bold text-slate-900" : "text-slate-700"}`}><span>{k}</span><span className="font-mono">{v}</span></div>
  );
  const Bhg = ({ no, tajuk, children, pecah = true }: { no: number; tajuk: string; children: React.ReactNode; pecah?: boolean }) => (
    <section className={`mb-8 ${pecah ? "break-before-page" : ""}`}>
      <h2 className="mb-3 border-b-2 border-surau/30 pb-2 text-lg font-bold text-surau">{no}. {tajuk}</h2>
      {children}
    </section>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="print-hide mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/agm" className="text-sm text-surau hover:underline">← Kembali ke AGM</Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Kewangan: tahun {tahunKira}</span>
          <ButangCetak label="Cetak / PDF" />
        </div>
      </div>

      {/* Kulit */}
      <div className="mb-8 break-after-page rounded-xl border border-surau/30 bg-surau/5 p-10 text-center">
        <div className="text-sm font-semibold uppercase tracking-widest text-surau">{NAMA_SURAU}</div>
        <div className="mt-8 text-3xl font-extrabold text-slate-900">Buku Laporan Tahunan {tahunAgm}</div>
        <div className="mt-2 text-lg font-semibold text-slate-700">{agm.tajuk} {tahunAgm}</div>
        <div className="mt-8 space-y-1 text-sm text-slate-600">
          <div>{agm.tarikh ?? "—"} {agm.masa ? `· ${agm.masa}` : ""}</div>
          <div>{agm.tempat ?? "—"}</div>
        </div>
      </div>

      {/* Isi kandungan */}
      <div className="mb-8 break-after-page">
        <h2 className="mb-3 border-b-2 border-surau/30 pb-2 text-lg font-bold text-surau">Isi Kandungan</h2>
        <ol className="list-decimal space-y-1 pl-6 text-sm text-slate-700">
          <li>Kata-Kata Aluan Pengerusi</li>
          <li>Atur Cara Mesyuarat Agung Tahun {tahunAgm}</li>
          <li>Agenda Mesyuarat Agung Tahun {tahunAgm}</li>
          <li>Senarai Nama Jawatankuasa SAR</li>
          <li>Surat Notis Mesyuarat Agung Tahun {tahunAgm}</li>
          <li>Laporan Setiausaha</li>
          <li>Laporan Biro-Biro</li>
          <li>Laporan Penyata Kewangan Berakhir 31 Disember {tahunKira}</li>
          <li>Pembentangan Usul / Cadangan</li>
        </ol>
      </div>

      <Bhg no={1} tajuk="Kata-Kata Aluan Pengerusi" pecah={false}><Teks k="kata_aluan_pengerusi" /></Bhg>

      <Bhg no={2} tajuk={`Atur Cara Mesyuarat Agung Tahun ${tahunAgm}`}>
        {agm.atur_cara?.trim()
          ? <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{agm.atur_cara}</div>
          : <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-400 print-hide">(Belum diisi — isi di <b>Maklumat Mesyuarat → Atur Cara / Nota</b>)</div>}
      </Bhg>

      <Bhg no={3} tajuk={`Agenda Mesyuarat Agung Tahun ${tahunAgm}`}><Teks k="agenda" /></Bhg>

      <Bhg no={4} tajuk="Senarai Nama Jawatankuasa SAR">
        {jk.length === 0 ? <p className="text-sm text-slate-400 print-hide">(Belum ada — isi di Senarai JK &amp; Biro)</p> : (
          <div className="space-y-4">
            {KUMP_JK.filter((k) => jk.some((j) => j.kumpulan === k.kod)).map((k) => (
              <div key={k.kod}>
                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">{k.label}</div>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100 text-sm">
                  {jk.filter((j) => j.kumpulan === k.kod).map((j, i) => (
                    <li key={i} className="flex justify-between gap-3 px-3 py-1.5"><span className="font-medium text-slate-700">{j.jawatan}</span><span className="text-slate-800">{j.nama}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Bhg>

      <Bhg no={5} tajuk={`Surat Notis Mesyuarat Agung Tahun ${tahunAgm}`}><Teks k="surat_notis" /></Bhg>

      <Bhg no={6} tajuk="Laporan Setiausaha"><Teks k="laporan_setiausaha" /></Bhg>

      <Bhg no={7} tajuk="Laporan Biro-Biro">
        {biro.length === 0 ? <p className="text-sm text-slate-400 print-hide">(Belum ada biro)</p> : (
          <div className="space-y-4">
            {biro.map((b, i) => (
              <div key={i} className="break-inside-avoid rounded-lg border border-slate-200 p-3">
                <div className="font-bold text-slate-900">{b.nama}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {b.ketua ? <>Ketua: {b.ketua}</> : null}{b.setiausaha ? <> · Setiausaha: {b.setiausaha}</> : null}
                </div>
                {b.ahli?.trim() && <div className="mt-1 text-xs text-slate-500">Ahli: {b.ahli.split("\n").map((x: string) => x.trim()).filter(Boolean).join(", ")}</div>}
                {b.laporan?.trim()
                  ? <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{b.laporan}</div>
                  : <div className="mt-2 text-xs text-slate-400 print-hide">(Laporan belum diisi)</div>}
              </div>
            ))}
          </div>
        )}
      </Bhg>

      <Bhg no={8} tajuk={`Laporan Penyata Kewangan Berakhir 31 Disember ${tahunKira}`}>
        <div className="rounded-lg border border-slate-200 p-4">
          <Baris k="Jumlah Pendapatan (semua tabung)" v={rm(totalMasuk)} tebal />
          <div className="ml-3"><Baris k="— Tabung Am" v={rm(totalMasuk - masukKhairat)} /><Baris k="— Tabung Khairat" v={rm(masukKhairat)} /></div>
          <Baris k="Jumlah Perbelanjaan (dibayar)" v={rm(totalKeluar)} tebal />
          <div className="ml-3"><Baris k="— Tabung Am" v={rm(totalKeluar - keluarKhairat)} /><Baris k="— Tabung Khairat" v={rm(keluarKhairat)} /></div>
          <div className="mt-2 border-t border-slate-200 pt-2"><Baris k="Lebihan / (Kurangan) tahun" v={rm(totalMasuk - totalKeluar)} tebal /></div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-1 text-xs font-bold uppercase text-slate-500">Pendapatan ikut kategori</div>
            {masukKat.length === 0 ? <p className="text-sm text-slate-400">Tiada rekod.</p> : masukKat.map((x) => <Baris key={x.nama} k={x.nama} v={rm(x.jum)} />)}
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-1 text-xs font-bold uppercase text-slate-500">Perbelanjaan ikut kategori</div>
            {keluarKat.length === 0 ? <p className="text-sm text-slate-400">Tiada rekod.</p> : keluarKat.map((x) => <Baris key={x.nama} k={x.nama} v={rm(x.jum)} />)}
          </div>
        </div>
        {teks.ulasan_kewangan?.trim() && (
          <div className="mt-3">
            <div className="mb-1 text-xs font-bold uppercase text-slate-500">Ulasan Bendahari</div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{teks.ulasan_kewangan}</div>
          </div>
        )}
        <p className="mt-2 text-[11px] text-slate-400">Angka dijana automatik dari transaksi bertarikh {tahunKira} (perbelanjaan berstatus &quot;dibayar&quot;). Sahkan dengan Bendahari sebelum dimuktamadkan.</p>
      </Bhg>

      <Bhg no={9} tajuk="Pembentangan Usul / Cadangan">
        {usul.length === 0 ? <p className="text-sm text-slate-400 print-hide">(Belum ada usul — isi di Usul &amp; Undian)</p> : (
          <div className="space-y-3">
            {usul.map((u, i) => (
              <div key={i} className="break-inside-avoid rounded-lg border border-slate-200 p-3">
                <div className="font-semibold text-slate-900">Usul {u.no}: {u.tajuk}</div>
                {u.keterangan && <div className="mt-0.5 text-sm text-slate-600">{u.keterangan}</div>}
                {u.keputusan && <div className="mt-1 text-xs text-slate-500">Keputusan: <b className="uppercase">{u.keputusan}</b> · Setuju {u.undi_setuju} / Tolak {u.undi_tolak} / Berkecuali {u.undi_berkecuali}</div>}
              </div>
            ))}
          </div>
        )}
      </Bhg>

      <div className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        {NAMA_SURAU} · Buku Laporan Tahunan {tahunAgm} · Dijana {new Date().toLocaleDateString("ms-MY", { timeZone: "Asia/Kuala_Lumpur" })}
      </div>
    </div>
  );
}
