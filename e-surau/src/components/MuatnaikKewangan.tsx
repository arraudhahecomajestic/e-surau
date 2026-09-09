"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { muatnaikKewangan, padamKewangan } from "@/app/admin/agm/actions";
import ButangPadam from "@/components/ButangPadam";

const TEMPLAT = `bahagian,label,nilai1,nilai2,nilai3,nilai4
# pendapatan/perbelanjaan/aset/liabiliti: nilai1 = tahun semasa, nilai2 = tahun lalu
# tabung: nilai1 = baki 1 Jan, nilai2 = terimaan, nilai3 = bayaran, nilai4 = baki 31 Dis
pendapatan,"Kutipan tabung / derma jemaah",0,0,,
pendapatan,"Infaq langganan",0,0,,
pendapatan,"Yuran Khairat Kematian",0,0,,
pendapatan,"Wakaf",0,0,,
pendapatan,"Sewaan ruang dan peralatan",0,0,,
pendapatan,"Penajaan dan yuran vendor",0,0,,
pendapatan,"Sumbangan / peruntukan pihak luar",0,0,,
pendapatan,"Tabung khas / program",0,0,,
pendapatan,"Lain-lain",0,0,,
perbelanjaan,"Utiliti — elektrik, air, internet",0,0,,
perbelanjaan,"Emolumen dan elaun",0,0,,
perbelanjaan,"Penyelenggaraan dan kebersihan",0,0,,
perbelanjaan,"Program dan dakwah",0,0,,
perbelanjaan,"Khairat kematian — pampasan",0,0,,
perbelanjaan,"Pentadbiran dan sistem",0,0,,
perbelanjaan,"Kebajikan kariah",0,0,,
perbelanjaan,"Pembelian aset dan peralatan",0,0,,
perbelanjaan,"Lain-lain",0,0,,
aset,"Wang tunai di tangan",0,0,,
aset,"Wang di bank — akaun am",0,0,,
aset,"Wang di bank — akaun khairat",0,0,,
aset,"Simpanan tetap",0,0,,
aset,"Yuran belum diterima",0,0,,
aset,"Aset tetap (nilai buku)",0,0,,
liabiliti,"Bil belum dijelaskan",0,0,,
liabiliti,"Tuntutan khairat diluluskan belum dibayar",0,0,,
liabiliti,"Deposit sewaan dipegang",0,0,,
tabung,"Tabung Am",0,0,0,0
tabung,"Tabung Khairat",0,0,0,0
tabung,"Tabung Program",0,0,0,0
tabung,"Tabung Wakaf",0,0,0,0
`;

export default function MuatnaikKewangan({ agmId, bilSediaAda }: { agmId: string; bilSediaAda: number }) {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [namaFail, setNamaFail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ralat, setRalat] = useState("");

  async function baca(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setNamaFail(f.name);
    setCsv(await f.text());
    setMsg(""); setRalat("");
  }
  async function naik() {
    if (!csv.trim()) { setRalat("Sila pilih fail CSV dahulu."); return; }
    setBusy(true); setRalat(""); setMsg("");
    const r = await muatnaikKewangan(agmId, csv); setBusy(false);
    if (r?.ok) { setMsg(`✓ ${r.bil} baris dimuat naik. Buku Laporan (B8) dah kemas kini.`); router.refresh(); }
    else setRalat(r?.msg ?? "Gagal muat naik.");
  }
  async function padam() {
    setBusy(true); await padamKewangan(agmId); setBusy(false); setMsg("Angka kewangan dipadam."); router.refresh();
  }
  function turunTemplat() {
    const blob = new Blob([TEMPLAT], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "templat_kewangan_buku.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 font-semibold text-slate-900">Muat Naik Angka Kewangan (CSV)</h2>
      <p className="mb-3 text-sm text-slate-600">Bendahari muat turun templat, isi angka dalam Excel/Sheets, simpan sebagai CSV, kemudian muat naik di sini. Angka akan terus dipaparkan dalam Buku Laporan Bahagian 8.</p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={turunTemplat} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">↓ Muat turun templat CSV</button>
        {bilSediaAda > 0 && <span className="text-xs font-medium text-emerald-600">{bilSediaAda} baris tersimpan sekarang</span>}
      </div>

      <div className="rounded-lg bg-slate-50 p-3">
        <input type="file" accept=".csv,text/csv" onChange={baca} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-surau file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" />
        {namaFail && <div className="mt-2 text-xs text-slate-500">Fail dipilih: {namaFail}</div>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button disabled={busy || !csv} onClick={naik} className="rounded-lg bg-surau px-4 py-2 text-sm font-bold text-white hover:bg-surau-dark disabled:opacity-50">{busy ? "Memproses…" : "Muat Naik"}</button>
          {bilSediaAda > 0 && <ButangPadam onPadam={padam} label="Padam angka" soalan="Padam semua angka kewangan? Buku kembali ke angka auto." variant="butang" disabled={busy} />}
          {msg && <span className="text-xs font-semibold text-emerald-600">{msg}</span>}
          {ralat && <span className="text-xs font-semibold text-red-600">{ralat}</span>}
        </div>
      </div>

      <div className="mt-3 text-[11px] leading-relaxed text-slate-400">
        <b>Format:</b> lajur <code>bahagian, label, nilai1, nilai2, nilai3, nilai4</code>. Bahagian sah: <code>pendapatan</code>, <code>perbelanjaan</code>, <code>aset</code>, <code>liabiliti</code>, <code>tabung</code>.
        Untuk pendapatan/perbelanjaan/aset/liabiliti: nilai1 = tahun semasa, nilai2 = tahun lalu. Untuk tabung: nilai1 = baki 1 Jan, nilai2 = terimaan, nilai3 = bayaran, nilai4 = baki 31 Dis. Muat naik baharu akan gantikan sepenuhnya angka lama.
      </div>
    </section>
  );
}
