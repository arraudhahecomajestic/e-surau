"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tandaGerakKerja, simpanCatatanGerak, tambahTugasanGerak, padamTugasanGerak } from "@/app/admin/agm/actions";

export type Tugasan = {
  id: string;
  fasa: string;        // kod unit "01".."12"
  fasa_nama: string;   // nama unit
  kod: string;         // "u1-1" (asal) / "x-…" (tambahan)
  tugasan: string;
  unit: string | null; // "decide" utk item perlu keputusan
  nota: string | null;
  susunan: number;
  selesai: boolean;
  selesai_oleh: string | null;
  catatan: string | null;
};

// Ketua/PIC & ahli tiap unit (dari kertas kerja JK Pelaksana).
const UNIT_META: Record<string, { ketua: string; ahli: string[] }> = {
  "01": { ketua: "Mohd Thalji Bin Ahmad Bakery", ahli: ["Mohammed Salihin Bin Ali (Timbalan Pengerusi)"] },
  "02": { ketua: "Syahmi Seliman", ahli: [] },
  "03": { ketua: "Muhammad Al Amin Bin Abdullah", ahli: [] },
  "04": { ketua: "Ridzuan Bin Ahmad Zaki", ahli: ["Shahrudin Bin Tembol"] },
  "05": { ketua: "Nurul Hidawati Binti Harun", ahli: ["1 sukarelawan"] },
  "06": { ketua: "Adnan Bin Abdullah", ahli: ["Mohd Farid Bin Ahmed", "Dzul Hilmi", "Ridzuan Bin Ahmad Zaki"] },
  "07": { ketua: "Wakil Nazir Masjid Rinching Hulu", ahli: ["SU Masjid Rinching Hulu", "1 petugas kiraan undi", "(Panel 100% bebas — tidak bertanding)"] },
  "08": { ketua: "Nurul Fatin Amira", ahli: ["Ummi Kalsom", "2 sukarelawan Muslimat"] },
  "09": { ketua: "Mohd Azrun Bin Abd. Rahman (Siak 1)", ahli: ["Syarwani (Bilal 1)", "Mohd Syamil (Imam 1)", "Shahrudin Bin Tembol"] },
  "10": { ketua: "Muhammad Nabhan", ahli: ["1 sukarelawan Pemuda"] },
  "11": { ketua: "Syed Wahiyuddin Bin Syed M. (Siak 2)", ahli: ["Noorhaffizul (Imam 2)", "1 sukarelawan"] },
  "12": { ketua: "Setiausaha — kumpul & susun ke Buku Laporan", ahli: [] },
};

const FILTER = [
  { k: "semua", label: "Semua" },
  { k: "belum", label: "Belum siap" },
  { k: "siap", label: "Siap" },
] as const;
type FilterKey = (typeof FILTER)[number]["k"];

export default function GerakKerjaPanel({ agmId, senarai }: { agmId: string; senarai: Tugasan[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("semua");
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [override, setOverride] = useState<Record<string, boolean>>({});
  const [openR, setOpenR] = useState<Record<string, boolean>>({});
  const [armed, setArmed] = useState<string | null>(null);
  const [tambahBusy, setTambahBusy] = useState<Record<string, boolean>>({});
  const catT = useRef<Record<string, any>>({});
  const addRef = useRef<Record<string, HTMLInputElement | null>>({});

  const siapkah = (t: Tugasan) => (t.id in override ? override[t.id] : t.selesai);

  const unitList = useMemo(() => {
    const map = new Map<string, { fasa: string; nama: string; items: Tugasan[] }>();
    for (const t of senarai) {
      if (!map.has(t.fasa)) map.set(t.fasa, { fasa: t.fasa, nama: t.fasa_nama, items: [] });
      map.get(t.fasa)!.items.push(t);
    }
    return Array.from(map.values());
  }, [senarai]);

  const jumlah = senarai.length;
  const bilSiap = senarai.filter(siapkah).length;
  const peratus = jumlah ? Math.round((bilSiap / jumlah) * 100) : 0;

  function lulus(t: Tugasan) {
    if (filter === "belum") return !siapkah(t);
    if (filter === "siap") return !!siapkah(t);
    return true;
  }

  async function toggle(t: Tugasan) {
    const nilai = !siapkah(t);
    setOverride((o) => ({ ...o, [t.id]: nilai }));
    setBusy((b) => ({ ...b, [t.id]: true }));
    const r = await tandaGerakKerja(t.id, nilai);
    setBusy((b) => ({ ...b, [t.id]: false }));
    if (!r.ok) { setOverride((o) => { const n = { ...o }; delete n[t.id]; return n; }); return; }
    router.refresh();
  }

  function catatanBerubah(id: string, teks: string) {
    clearTimeout(catT.current[id]);
    catT.current[id] = setTimeout(() => { simpanCatatanGerak(id, teks); }, 700);
  }
  function catatanSimpan(id: string, teks: string) {
    clearTimeout(catT.current[id]);
    simpanCatatanGerak(id, teks);
  }

  async function tambah(fasa: string, fasaNama: string) {
    const el = addRef.current[fasa];
    const teks = (el?.value ?? "").trim();
    if (!teks) return;
    setTambahBusy((b) => ({ ...b, [fasa]: true }));
    const r = await tambahTugasanGerak(agmId, fasa, fasaNama, teks);
    setTambahBusy((b) => ({ ...b, [fasa]: false }));
    if (r.ok) { if (el) el.value = ""; router.refresh(); }
  }

  async function padam(id: string) {
    setArmed(null);
    setBusy((b) => ({ ...b, [id]: true }));
    const r = await padamTugasanGerak(id);
    setBusy((b) => ({ ...b, [id]: false }));
    if (r.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Kemajuan */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-lg font-extrabold text-slate-900">{bilSiap} <span className="text-sm font-medium text-slate-400">/ {jumlah} tugasan siap</span></div>
          <div className="font-mono text-sm font-bold text-surau">{peratus}%</div>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-surau transition-all" style={{ width: `${peratus}%` }} /></div>
      </div>

      {/* Tapisan */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER.map((f) => (
          <button key={f.k} onClick={() => setFilter(f.k)} className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${filter === f.k ? "border-surau bg-surau text-white" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>{f.label}</button>
        ))}
      </div>

      {/* Unit & tugasan */}
      {unitList.map((u) => {
        const meta = UNIT_META[u.fasa];
        const vis = u.items.filter(lulus);
        const dd = u.items.filter(siapkah).length;
        return (
          <section key={u.fasa} className="space-y-1">
            <div className="mt-2 flex items-center gap-3">
              <div className="grid h-8 w-8 flex-none place-content-center rounded-lg bg-surau/10 font-bold text-surau-dark">{parseInt(u.fasa, 10) || u.fasa}</div>
              <h2 className="text-[15px] font-bold text-slate-900">{u.nama}</h2>
              <span className="ml-auto font-mono text-xs font-semibold text-slate-400">{dd}/{u.items.length}</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {meta && (
                <div className="flex flex-col gap-1 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                  <div className="flex flex-wrap items-baseline gap-2"><span className="w-8 flex-none text-[10px] font-bold uppercase tracking-wide text-surau-dark">PIC</span><span className="text-sm font-bold text-slate-800">{meta.ketua}</span></div>
                  {meta.ahli.length > 0 && <div className="flex flex-wrap items-baseline gap-2"><span className="w-8 flex-none text-[10px] font-bold uppercase tracking-wide text-surau-dark">Ahli</span><span className="text-[13px] text-slate-500">{meta.ahli.join(" · ")}</span></div>}
                </div>
              )}
              {vis.length > 0 && (
                <ul className="divide-y divide-slate-100">
                  {vis.map((t) => {
                    const siap = siapkah(t);
                    const decide = t.unit === "decide";
                    const mine = t.kod.startsWith("x-");
                    const hasCat = !!(t.catatan && t.catatan.trim());
                    const showR = decide || hasCat || openR[t.id];
                    const ph = decide ? "Catat keputusan / remark (cth: Menu 2 dipilih, katerer Kak June)…" : "Catatan…";
                    return (
                      <li key={t.id} className="flex items-start gap-3 px-4 py-3">
                        <input type="checkbox" checked={siap} disabled={busy[t.id]} onChange={() => toggle(t)} className="mt-0.5 h-[19px] w-[19px] flex-none cursor-pointer rounded accent-emerald-600 disabled:opacity-50" />
                        <div className="min-w-0 flex-1">
                          <p className={`text-[14.5px] ${siap ? "text-slate-400 line-through" : "text-slate-800"}`}>{t.tugasan}</p>
                          {t.nota && <p className="mt-1 text-xs text-slate-400">{t.nota}</p>}
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {mine && <span className="rounded bg-surau/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-surau-dark">Tambahan</span>}
                            {decide && <span className="rounded bg-surau/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-surau-dark">Perlu keputusan</span>}
                            {siap && t.selesai_oleh && <span className="text-[11px] text-slate-400">✓ {t.selesai_oleh}</span>}
                          </div>
                          {showR ? (
                            <textarea
                              defaultValue={t.catatan ?? ""}
                              onChange={(e) => catatanBerubah(t.id, e.target.value)}
                              onBlur={(e) => catatanSimpan(t.id, e.target.value)}
                              rows={2}
                              placeholder={ph}
                              className={`mt-2 w-full rounded-lg border px-2.5 py-1.5 text-[13px] text-slate-800 focus:outline-none ${decide ? "border-surau bg-surau/5 focus:border-surau-dark" : "border-slate-200 bg-slate-50 focus:border-surau"}`}
                            />
                          ) : (
                            <button onClick={() => setOpenR((o) => ({ ...o, [t.id]: true }))} className="mt-1.5 text-xs font-semibold text-surau-dark hover:underline">＋ Catatan</button>
                          )}
                        </div>
                        {armed === t.id ? (
                          <button onClick={() => padam(t.id)} disabled={busy[t.id]} className="flex-none rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-50">Buang?</button>
                        ) : (
                          <button onClick={() => setArmed(t.id)} aria-label="Buang tugasan" className="flex-none px-1 text-xl leading-none text-slate-300 hover:text-red-500">×</button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {/* Tambah tugasan */}
              <div className="flex items-center gap-2 border-t border-dashed border-slate-200 px-3 py-2.5">
                <input
                  ref={(el) => { addRef.current[u.fasa] = el; }}
                  type="text" maxLength={200}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); tambah(u.fasa, u.nama); } }}
                  placeholder={`Tambah tugasan ${u.nama.split(" ")[0]}…`}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[14px] text-slate-800 focus:border-surau focus:outline-none"
                />
                <button onClick={() => tambah(u.fasa, u.nama)} disabled={tambahBusy[u.fasa]} className="flex-none rounded-lg bg-surau px-3.5 py-2 text-[13px] font-bold text-white hover:bg-surau-dark disabled:opacity-50">Tambah</button>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
