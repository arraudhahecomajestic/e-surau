"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tambahJk, padamJk, tambahBiro, kemasBiro, padamBiro } from "@/app/admin/agm/actions";

type Jk = { id: string; kumpulan: string; jawatan: string; nama: string; biro: string | null };
type Biro = { id: string; nama: string; ketua: string | null; laporan: string | null };

const KUMP: { kod: string; label: string }[] = [
  { kod: "penaung", label: "Penaung & Penasihat" },
  { kod: "induk", label: "Jawatankuasa Induk" },
  { kod: "ketua_biro", label: "Ketua Biro" },
  { kod: "ajk_biasa", label: "Ahli Jawatankuasa Biasa" },
  { kod: "juruaudit", label: "Juruaudit Dalaman" },
  { kod: "staf", label: "Petugas & Staf Surau" },
];
const labelKump = (k: string) => KUMP.find((x) => x.kod === k)?.label ?? k;

export default function AgmJkPanel({ agmId, jk, biro }: { agmId: string; jk: Jk[]; biro: Biro[] }) {
  return (
    <div className="space-y-6">
      <SenaraiJk agmId={agmId} jk={jk} />
      <LaporanBiro agmId={agmId} biro={biro} />
    </div>
  );
}

/* ---- Senarai JK ---- */
function SenaraiJk({ agmId, jk }: { agmId: string; jk: Jk[] }) {
  const router = useRouter();
  const [kumpulan, setKumpulan] = useState("induk");
  const [jawatan, setJawatan] = useState("");
  const [nama, setNama] = useState("");
  const [biro, setBiro] = useState("");
  const [busy, setBusy] = useState(false);

  async function tambah() {
    if (!jawatan.trim() || !nama.trim()) return;
    setBusy(true); await tambahJk(agmId, kumpulan, jawatan, nama, biro); setBusy(false);
    setJawatan(""); setNama(""); setBiro(""); router.refresh();
  }
  async function buang(id: string) { if (!window.confirm("Padam ahli JK ini?")) return; setBusy(true); await padamJk(id); setBusy(false); router.refresh(); }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-semibold text-slate-900">Senarai Jawatankuasa</h2>

      <div className="mb-4 grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
        <label className="block"><span className="text-xs font-medium text-slate-600">Kumpulan</span>
          <select value={kumpulan} onChange={(e) => setKumpulan(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            {KUMP.map((k) => <option key={k.kod} value={k.kod}>{k.label}</option>)}
          </select></label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Jawatan</span>
          <input value={jawatan} onChange={(e) => setJawatan(e.target.value)} placeholder="cth: Pengerusi" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Nama</span>
          <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama penuh" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Biro (pilihan)</span>
          <input value={biro} onChange={(e) => setBiro(e.target.value)} placeholder="cth: Biro Program" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
        <div className="sm:col-span-2"><button disabled={busy} onClick={tambah} className="rounded-lg bg-surau px-4 py-2 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-50">+ Tambah ke Senarai</button></div>
      </div>

      {jk.length === 0 ? <p className="text-sm text-slate-400">Belum ada nama dalam senarai.</p> : (
        <div className="space-y-4">
          {KUMP.filter((k) => jk.some((j) => j.kumpulan === k.kod)).map((k) => (
            <div key={k.kod}>
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-surau">{k.label}</div>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100 text-sm">
                {jk.filter((j) => j.kumpulan === k.kod).map((j) => (
                  <li key={j.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                    <span className="min-w-0"><b>{j.jawatan}</b> — {j.nama}{j.biro ? <span className="ml-2 text-xs text-slate-400">({j.biro})</span> : ""}</span>
                    <button onClick={() => buang(j.id)} className="shrink-0 text-xs text-red-500 hover:underline">padam</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---- Laporan Biro ---- */
function LaporanBiro({ agmId, biro }: { agmId: string; biro: Biro[] }) {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [ketua, setKetua] = useState("");
  const [busy, setBusy] = useState(false);

  async function tambah() {
    if (!nama.trim()) return;
    setBusy(true); await tambahBiro(agmId, nama, ketua); setBusy(false); setNama(""); setKetua(""); router.refresh();
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-semibold text-slate-900">Laporan Biro-Biro</h2>

      <div className="mb-4 flex flex-wrap gap-2 rounded-lg bg-slate-50 p-3">
        <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama biro (cth: Biro Dakwah)" className="min-w-[160px] flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        <input value={ketua} onChange={(e) => setKetua(e.target.value)} placeholder="Ketua biro (pilihan)" className="min-w-[160px] flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        <button disabled={busy} onClick={tambah} className="rounded-lg bg-surau px-4 py-2 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-50">+ Tambah Biro</button>
      </div>

      {biro.length === 0 ? <p className="text-sm text-slate-400">Belum ada biro.</p> : (
        <div className="space-y-3">{biro.map((b) => <BiroRow key={b.id} b={b} onDone={() => router.refresh()} />)}</div>
      )}
    </section>
  );
}

function BiroRow({ b, onDone }: { b: Biro; onDone: () => void }) {
  const [ketua, setKetua] = useState(b.ketua ?? "");
  const [laporan, setLaporan] = useState(b.laporan ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function simpan() { setBusy(true); await kemasBiro(b.id, ketua, laporan); setBusy(false); setMsg("✓ Disimpan"); setTimeout(() => setMsg(""), 2000); onDone(); }
  async function padam() { if (!window.confirm("Padam biro ini & laporannya?")) return; setBusy(true); await padamBiro(b.id); setBusy(false); onDone(); }

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-semibold text-slate-900">{b.nama}</div>
        <button onClick={padam} className="text-xs text-red-500 hover:underline">padam biro</button>
      </div>
      <label className="mb-2 block"><span className="text-xs font-medium text-slate-600">Ketua biro</span>
        <input value={ketua} onChange={(e) => setKetua(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
      <label className="block"><span className="text-xs font-medium text-slate-600">Laporan biro</span>
        <textarea value={laporan} onChange={(e) => setLaporan(e.target.value)} rows={4} placeholder="Ringkasan aktiviti & pencapaian biro sepanjang tahun…" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
      <div className="mt-2 flex items-center gap-3">
        <button disabled={busy} onClick={simpan} className="rounded-lg bg-surau px-4 py-1.5 text-xs font-bold text-white hover:bg-surau-dark disabled:opacity-50">Simpan Laporan</button>
        {msg && <span className="text-xs font-semibold text-emerald-600">{msg}</span>}
      </div>
    </div>
  );
}
