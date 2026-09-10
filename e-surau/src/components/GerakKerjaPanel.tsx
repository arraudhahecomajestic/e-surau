"use client";

import { useMemo, useState } from "react";
import { tandaGerakKerja } from "@/app/admin/agm/actions";

export type Tugasan = {
  id: string;
  fasa: string;
  fasa_nama: string;
  kod: string;
  tugasan: string;
  unit: string | null;
  tarikh_sasaran: string | null;
  nota: string | null;
  susunan: number;
  selesai: boolean;
  selesai_oleh: string | null;
  status: string; // selesai | lewat | hari_ini | belum
  baki_hari: number | null;
};

const BULAN = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
function tarikhPendek(iso: string | null) {
  if (!iso) return "";
  const q = iso.slice(0, 10).split("-");
  if (q.length < 3) return "";
  return `${+q[2]} ${BULAN[+q[1] - 1] ?? ""}`;
}

const FILTER = [
  { k: "semua", label: "Semua" },
  { k: "belum", label: "Belum selesai" },
  { k: "lewat", label: "Lewat" },
  { k: "siap", label: "Selesai" },
] as const;
type FilterKey = (typeof FILTER)[number]["k"];

export default function GerakKerjaPanel({ senarai, units, unitSaya = "" }: { senarai: Tugasan[]; units: string[]; unitSaya?: string }) {
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    for (const t of senarai) m[t.id] = t.selesai;
    return m;
  });
  const [filter, setFilter] = useState<FilterKey>("semua");
  const [unitF, setUnitF] = useState<string>(unitSaya || "");
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const isLewat = (t: Tugasan) => !done[t.id] && (t.status === "lewat");
  const isHariIni = (t: Tugasan) => !done[t.id] && (t.status === "hari_ini");

  // Susun ikut fasa (kekal turutan datang).
  const fasaList = useMemo(() => {
    const map = new Map<string, { fasa: string; nama: string; when: string; items: Tugasan[] }>();
    for (const t of senarai) {
      if (!map.has(t.fasa)) map.set(t.fasa, { fasa: t.fasa, nama: t.fasa_nama, when: "", items: [] });
      map.get(t.fasa)!.items.push(t);
    }
    return Array.from(map.values());
  }, [senarai]);

  const jumlah = senarai.length;
  const bilSiap = senarai.filter((t) => done[t.id]).length;
  const bilLewat = senarai.filter(isLewat).length;
  const peratus = jumlah ? Math.round((bilSiap / jumlah) * 100) : 0;

  function lulus(t: Tugasan) {
    if (unitF && (t.unit ?? "") !== unitF) return false;
    if (filter === "belum") return !done[t.id];
    if (filter === "siap") return !!done[t.id];
    if (filter === "lewat") return isLewat(t);
    return true;
  }

  async function toggle(t: Tugasan) {
    const nilai = !done[t.id];
    setDone((d) => ({ ...d, [t.id]: nilai }));
    setBusy((b) => ({ ...b, [t.id]: true }));
    const r = await tandaGerakKerja(t.id, nilai);
    setBusy((b) => ({ ...b, [t.id]: false }));
    if (!r.ok) setDone((d) => ({ ...d, [t.id]: !nilai })); // gagal — undur
  }

  return (
    <div className="space-y-4">
      {/* Kad kemajuan */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-lg font-extrabold text-slate-900">{bilSiap} <span className="text-sm font-medium text-slate-400">/ {jumlah} tugasan selesai</span></div>
          {bilLewat > 0 && <div className="text-xs font-semibold text-red-600">{bilLewat} tugasan lewat</div>}
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-surau transition-all" style={{ width: `${peratus}%` }} /></div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-slate-500">
          {fasaList.map((f) => {
            const dd = f.items.filter((i) => done[i.id]).length;
            return <span key={f.fasa}>{f.fasa}. {f.nama} <b className="text-slate-800">{dd}/{f.items.length}</b></span>;
          })}
        </div>
      </div>

      {/* Tapisan */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER.map((f) => (
          <button key={f.k} onClick={() => setFilter(f.k)} className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium ${filter === f.k ? "border-surau bg-surau text-white" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>{f.label}</button>
        ))}
        <select value={unitF} onChange={(e) => setUnitF(e.target.value)} className="ml-auto rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-700">
          <option value="">Semua unit</option>
          {unitSaya && <option value={unitSaya}>Tugasan saya ({unitSaya})</option>}
          {units.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      {/* Fasa & tugasan */}
      {(() => {
        let ditunjuk = 0;
        const bahagian = fasaList.map((f) => {
          const vis = f.items.filter(lulus);
          if (!vis.length) return null;
          ditunjuk += vis.length;
          const dd = f.items.filter((i) => done[i.id]).length;
          return (
            <section key={f.fasa} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-1 flex items-baseline gap-2 border-b-2 border-slate-800 pb-2">
                <h2 className="text-[15px] font-bold text-slate-900">{f.fasa}. {f.nama}</h2>
                <span className="ml-auto font-mono text-xs text-slate-400">{dd}/{f.items.length}</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {vis.map((t) => {
                  const siap = !!done[t.id];
                  const lewat = isLewat(t);
                  const hariIni = isHariIni(t);
                  return (
                    <li key={t.id} className="flex items-start gap-3 py-3">
                      <input type="checkbox" checked={siap} disabled={busy[t.id]} onChange={() => toggle(t)}
                        className="mt-0.5 h-[19px] w-[19px] shrink-0 cursor-pointer rounded accent-emerald-600 disabled:opacity-50" />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${siap ? "text-slate-400 line-through" : "text-slate-800"}`}>{t.tugasan}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          {t.unit && <span className="rounded bg-surau/10 px-2 py-0.5 text-[11px] font-semibold text-surau-dark">{t.unit}</span>}
                          {lewat
                            ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-600">Lewat · {tarikhPendek(t.tarikh_sasaran)}</span>
                            : hariIni
                              ? <span className="rounded bg-surau/10 px-1.5 py-0.5 text-[11px] font-medium text-surau-dark">Hari ini · {tarikhPendek(t.tarikh_sasaran)}</span>
                              : t.tarikh_sasaran && <span className="text-[11px] text-slate-400">{tarikhPendek(t.tarikh_sasaran)}</span>}
                          {siap && t.selesai_oleh && <span className="text-[11px] text-slate-400">✓ {t.selesai_oleh}</span>}
                        </div>
                        {t.nota && <p className="mt-1 text-xs text-slate-400">{t.nota}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        });
        return ditunjuk ? <div className="space-y-4">{bahagian}</div> : <p className="px-1 py-4 text-sm text-slate-400">Tiada tugasan dalam tapisan ini.</p>;
      })()}
    </div>
  );
}
