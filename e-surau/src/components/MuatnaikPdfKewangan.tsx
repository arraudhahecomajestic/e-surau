"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { muatnaikPdfKewangan, padamPdfKewangan } from "@/app/admin/agm/actions";
import ButangPadam from "@/components/ButangPadam";

export type FailKewangan = { id: string; tajuk: string; url: string; saiz: number | null; dimuat_oleh: string | null; dicipta: string };

function saizMb(b: number | null) {
  if (!b) return "";
  const mb = b / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
}
function tarikhMs(d: string) {
  const x = new Date(d);
  return isNaN(x.getTime()) ? "" : x.toLocaleDateString("ms-MY", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MuatnaikPdfKewangan({ agmId, fail }: { agmId: string; fail: FailKewangan[] }) {
  const router = useRouter();
  const [tajuk, setTajuk] = useState("Penyata Kewangan");
  const [pilih, setPilih] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ralat, setRalat] = useState("");

  function baca(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setPilih(f); setMsg(""); setRalat("");
    if (f && f.type && f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) setRalat("Fail PDF sahaja.");
    if (f && f.size > 15 * 1024 * 1024) setRalat("Fail terlalu besar (maksimum 15MB).");
  }
  async function naik() {
    if (!pilih) { setRalat("Sila pilih fail PDF dahulu."); return; }
    setBusy(true); setRalat(""); setMsg("");
    const fd = new FormData();
    fd.set("tajuk", tajuk.trim() || "Penyata Kewangan");
    fd.set("fail", pilih);
    const r = await muatnaikPdfKewangan(agmId, fd); setBusy(false);
    if (r?.ok) { setMsg("✓ Fail dimuat naik."); setPilih(null); router.refresh(); }
    else setRalat(r?.msg ?? "Gagal muat naik.");
  }
  async function padam(id: string) { await padamPdfKewangan(id); router.refresh(); }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 font-semibold text-slate-900">Muat Naik Penyata Kewangan (PDF)</h2>
      <p className="mb-3 text-sm text-slate-600">Muat naik penyata kewangan atau laporan juruaudit dalam bentuk PDF. Boleh lebih dari satu fail. Fail akan tersedia untuk dimuat turun dalam laporan kewangan.</p>

      {fail.length > 0 && (
        <ul className="mb-3 divide-y divide-slate-100 rounded-lg border border-slate-100">
          {fail.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <a href={f.url} target="_blank" rel="noopener" className="flex items-center gap-2 font-semibold text-surau hover:underline">
                  <span aria-hidden>📄</span><span className="truncate">{f.tajuk}</span>
                </a>
                <div className="mt-0.5 text-[11px] text-slate-400">
                  {saizMb(f.saiz)}{f.saiz ? " · " : ""}{tarikhMs(f.dicipta)}{f.dimuat_oleh ? ` · oleh ${f.dimuat_oleh}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs">
                <a href={f.url} target="_blank" rel="noopener" className="font-semibold text-slate-500 hover:underline">buka</a>
                <ButangPadam onPadam={() => padam(f.id)} soalan={`Padam "${f.tajuk}"?`} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg bg-slate-50 p-3">
        <label className="mb-1 block text-xs font-semibold text-slate-500">Tajuk fail</label>
        <input value={tajuk} onChange={(e) => setTajuk(e.target.value)} placeholder="cth: Penyata Kewangan 2025 / Laporan Juruaudit"
          className="mb-3 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
        <input type="file" accept="application/pdf,.pdf" onChange={baca}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-surau file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" />
        {pilih && <div className="mt-2 text-xs text-slate-500">Fail dipilih: {pilih.name} ({saizMb(pilih.size)})</div>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button disabled={busy || !pilih} onClick={naik} className="rounded-lg bg-surau px-4 py-2 text-sm font-bold text-white hover:bg-surau-dark disabled:opacity-50">{busy ? "Memuat naik…" : "Muat Naik PDF"}</button>
          {msg && <span className="text-xs font-semibold text-emerald-600">{msg}</span>}
          {ralat && <span className="text-xs font-semibold text-red-600">{ralat}</span>}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-slate-400">Format: PDF sahaja, maksimum 15MB setiap fail.</p>
    </section>
  );
}
