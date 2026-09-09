"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tambahJk, padamJk, simpanSusunanJk, tambahBiro, kemasBiro, padamBiro, bantuTulisBiro } from "@/app/admin/agm/actions";
import ButangPadam from "@/components/ButangPadam";

type Jk = { id: string; kumpulan: string; jawatan: string; nama: string; biro: string | null };
type Biro = { id: string; nama: string; ketua: string | null; setiausaha: string | null; ahli: string | null; laporan: string | null };

export default function AgmJkPanel({ agmId, jk, biro }: { agmId: string; jk: Jk[]; biro: Biro[] }) {
  return (
    <div className="space-y-6">
      <SenaraiJk agmId={agmId} jk={jk} />
      <LaporanBiro agmId={agmId} biro={biro} />
    </div>
  );
}

/* ---- Senarai JK (senarai rata + seret untuk susun) ---- */
function SenaraiJk({ agmId, jk }: { agmId: string; jk: Jk[] }) {
  const router = useRouter();
  const [jawatan, setJawatan] = useState("");
  const [nama, setNama] = useState("");
  const [biro, setBiro] = useState("");
  const [busy, setBusy] = useState(false);

  // susunan setempat untuk drag & drop
  const [urutan, setUrutan] = useState<Jk[]>(jk);
  const [dragI, setDragI] = useState<number | null>(null);
  const [overI, setOverI] = useState<number | null>(null);
  const [ubah, setUbah] = useState(false);
  const [msg, setMsg] = useState("");

  // selaras semula bila data dari server berubah (lepas refresh)
  useEffect(() => { setUrutan(jk); setUbah(false); }, [jk]);

  async function tambah() {
    if (!jawatan.trim() || !nama.trim()) return;
    setBusy(true); await tambahJk(agmId, "induk", jawatan, nama, biro); setBusy(false);
    setJawatan(""); setNama(""); setBiro(""); router.refresh();
  }
  async function buang(id: string) { setBusy(true); await padamJk(id); setBusy(false); router.refresh(); }

  function jatuh(ke: number) {
    if (dragI === null || dragI === ke) { setDragI(null); setOverI(null); return; }
    const arr = [...urutan];
    const [pindah] = arr.splice(dragI, 1);
    arr.splice(ke, 0, pindah);
    setUrutan(arr); setUbah(true); setDragI(null); setOverI(null);
  }
  async function simpanSusunan() {
    setBusy(true); setMsg("");
    const r = await simpanSusunanJk(agmId, urutan.map((x) => x.id));
    setBusy(false);
    if (r?.ok) { setUbah(false); setMsg("✓ Susunan disimpan — buku laporan dah kemas kini."); setTimeout(() => setMsg(""), 3500); router.refresh(); }
    else setMsg(r?.msg ?? "Gagal simpan susunan.");
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 font-semibold text-slate-900">Senarai Jawatankuasa</h2>
      <p className="mb-3 text-xs text-slate-500">Seret mana-mana baris untuk susun ikut keutamaan. Tekan <b>Simpan Susunan</b> supaya turutan kekal &amp; terpapar sama dalam Buku Laporan (Bahagian 4).</p>

      <div className="mb-4 grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
        <label className="block"><span className="text-xs font-medium text-slate-600">Jawatan</span>
          <input value={jawatan} onChange={(e) => setJawatan(e.target.value)} placeholder="cth: Pengerusi" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Nama</span>
          <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama penuh" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
        <label className="block sm:col-span-2"><span className="text-xs font-medium text-slate-600">Biro (pilihan)</span>
          <input value={biro} onChange={(e) => setBiro(e.target.value)} placeholder="cth: Biro Program" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
        <div className="sm:col-span-2"><button disabled={busy} onClick={tambah} className="rounded-lg bg-surau px-4 py-2 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-50">Tambah ke Senarai</button></div>
      </div>

      {urutan.length === 0 ? <p className="text-sm text-slate-400">Belum ada nama dalam senarai.</p> : (
        <>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100 text-sm">
            {urutan.map((j, i) => (
              <li
                key={j.id}
                draggable
                onDragStart={() => setDragI(i)}
                onDragOver={(e) => { e.preventDefault(); setOverI(i); }}
                onDrop={() => jatuh(i)}
                onDragEnd={() => { setDragI(null); setOverI(null); }}
                className={`flex cursor-grab items-center justify-between gap-3 px-3 py-2 active:cursor-grabbing ${overI === i && dragI !== null && dragI !== i ? "bg-surau/10" : ""} ${dragI === i ? "opacity-40" : ""}`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="w-6 shrink-0 select-none text-right text-xs font-semibold text-slate-400">{i + 1}.</span>
                  <span className="min-w-0"><b>{j.jawatan}</b> — {j.nama}{j.biro ? <span className="ml-2 text-xs text-slate-400">({j.biro})</span> : ""}</span>
                </span>
                <span className="shrink-0"><ButangPadam onPadam={() => buang(j.id)} soalan="Padam ahli JK ni?" /></span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-3">
            <button disabled={busy || !ubah} onClick={simpanSusunan} className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-40">{busy ? "Menyimpan…" : "Simpan Susunan"}</button>
            {ubah && <span className="text-xs font-medium text-amber-600">Susunan belum disimpan</span>}
            {msg && <span className="text-xs font-semibold text-emerald-600">{msg}</span>}
          </div>
        </>
      )}
    </section>
  );
}

/* ---- Laporan Biro ---- */
function LaporanBiro({ agmId, biro }: { agmId: string; biro: Biro[] }) {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [ketua, setKetua] = useState("");
  const [setiausaha, setSetiausaha] = useState("");
  const [busy, setBusy] = useState(false);

  async function tambah() {
    if (!nama.trim()) return;
    setBusy(true); await tambahBiro(agmId, nama, ketua, setiausaha, ""); setBusy(false);
    setNama(""); setKetua(""); setSetiausaha(""); router.refresh();
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-semibold text-slate-900">Biro-Biro &amp; Laporan</h2>

      <div className="mb-4 grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
        <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama biro (cth: Biro Dakwah)" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm sm:col-span-2" />
        <input value={ketua} onChange={(e) => setKetua(e.target.value)} placeholder="Ketua biro (pilihan)" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        <input value={setiausaha} onChange={(e) => setSetiausaha(e.target.value)} placeholder="Setiausaha biro (pilihan)" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        <div className="sm:col-span-2"><button disabled={busy} onClick={tambah} className="rounded-lg bg-surau px-4 py-2 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-50">Tambah Biro</button></div>
      </div>

      {biro.length === 0 ? <p className="text-sm text-slate-400">Belum ada biro.</p> : (
        <div className="space-y-3">{biro.map((b) => <BiroRow key={b.id} b={b} onDone={() => router.refresh()} />)}</div>
      )}
    </section>
  );
}

function BiroRow({ b, onDone }: { b: Biro; onDone: () => void }) {
  const [ketua, setKetua] = useState(b.ketua ?? "");
  const [setiausaha, setSetiausaha] = useState(b.setiausaha ?? "");
  const [ahli, setAhli] = useState(b.ahli ?? "");
  const [laporan, setLaporan] = useState(b.laporan ?? "");
  const [arahan, setArahan] = useState("");
  const [sebelum, setSebelum] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyAI, setBusyAI] = useState(false);
  const [msg, setMsg] = useState("");
  const [ralat, setRalat] = useState("");

  async function simpan() { setBusy(true); await kemasBiro(b.id, ketua, laporan, setiausaha, ahli); setBusy(false); setSebelum(null); setMsg("✓ Disimpan"); setTimeout(() => setMsg(""), 2000); onDone(); }
  async function padam() { setBusy(true); await padamBiro(b.id); setBusy(false); onDone(); }

  async function bantuAI() {
    setBusyAI(true); setRalat(""); setMsg("");
    const r = await bantuTulisBiro(b.nama, ketua, ahli, arahan, laporan);
    setBusyAI(false);
    if (r.ok && r.teks) {
      setSebelum(laporan);
      setLaporan(r.teks);
      setMsg("AI dah tulis — semak & Simpan.");
      setTimeout(() => setMsg(""), 4000);
    } else {
      setRalat(r.msg ?? "AI gagal. Cuba lagi.");
    }
  }
  function undo() { if (sebelum === null) return; setLaporan(sebelum); setSebelum(null); setMsg("Dikembalikan."); setTimeout(() => setMsg(""), 2500); }

  const bilAhli = ahli.split("\n").map((x) => x.trim()).filter(Boolean).length;
  const adaLaporan = laporan.trim().length > 0;

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-semibold text-slate-900">{b.nama}</div>
        <ButangPadam onPadam={padam} label="padam biro" soalan="Padam biro ni & laporannya?" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block"><span className="text-xs font-medium text-slate-600">Ketua biro</span>
          <input value={ketua} onChange={(e) => setKetua(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Setiausaha biro</span>
          <input value={setiausaha} onChange={(e) => setSetiausaha(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
      </div>
      <label className="mt-2 block"><span className="text-xs font-medium text-slate-600">Ahli-ahli <span className="text-slate-400">(satu nama setiap baris — {bilAhli} ahli)</span></span>
        <textarea value={ahli} onChange={(e) => setAhli(e.target.value)} rows={4} placeholder={"cth:\nTimbalan Pengerusi\nImam 1\nBilal 1"} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm leading-relaxed" /></label>
      <label className="mt-2 block"><span className="text-xs font-medium text-slate-600">Nota / arahan untuk AI (pilihan)</span>
        <textarea value={arahan} onChange={(e) => setArahan(e.target.value)} rows={2} placeholder="cth: program utama biro tahun ni, pencapaian, bilangan aktiviti…" className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-sm" /></label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button onClick={bantuAI} disabled={busyAI} className="rounded-lg bg-surau px-3 py-1.5 text-xs font-bold text-white hover:bg-surau-dark disabled:opacity-50">
          {busyAI ? "AI menulis…" : adaLaporan ? "Perkemas dengan AI" : "Bantu tulis (AI)"}
        </button>
        {sebelum !== null && <button onClick={undo} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Undo AI</button>}
      </div>
      <label className="mt-2 block"><span className="text-xs font-medium text-slate-600">Laporan biro (pilihan)</span>
        <textarea value={laporan} onChange={(e) => setLaporan(e.target.value)} rows={5} placeholder="Ringkasan aktiviti & pencapaian biro sepanjang tahun…" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm leading-relaxed" /></label>
      <div className="mt-2 flex items-center gap-3">
        <button disabled={busy} onClick={simpan} className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-50">Simpan Biro</button>
        {msg && <span className="text-xs font-semibold text-emerald-600">{msg}</span>}
        {ralat && <span className="text-xs font-semibold text-red-600">{ralat}</span>}
      </div>
    </div>
  );
}
