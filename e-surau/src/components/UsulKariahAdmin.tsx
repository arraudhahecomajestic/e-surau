"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { padamUsulKariah, tukarStatusUsulKariah } from "@/app/admin/agm/actions";
import ButangPadam from "@/components/ButangPadam";

type Usul = {
  id: string; nama: string; no_tel: string | null; no_kp: string | null;
  ahli_id: string | null; usul: string; penjelasan: string | null;
  status: string; dicipta: string;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  baru: { label: "Baru", cls: "bg-slate-100 text-slate-600" },
  diterima: { label: "Diterima", cls: "bg-emerald-100 text-emerald-700" },
  ditolak: { label: "Ditolak", cls: "bg-red-100 text-red-700" },
};

function bila(iso: string) {
  try { return new Date(iso).toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" }); } catch { return ""; }
}

// Taraf keahlian pengirim: peta ahli_id -> maklumat_disahkan (dari page).
function taraf(u: Usul, disahkan: Record<string, boolean>) {
  if (!u.ahli_id) return { label: "Bukan ahli", cls: "bg-amber-50 text-amber-600" };
  if (disahkan[u.ahli_id]) return { label: "Dah kemaskini", cls: "bg-emerald-50 text-emerald-600" };
  return { label: "Belum kemaskini", cls: "bg-red-50 text-red-600" };
}

export default function UsulKariahAdmin({ kod, senarai, disahkan = {} }: { kod: string | null; senarai: Usul[]; disahkan?: Record<string, boolean> }) {
  const router = useRouter();
  const [salin, setSalin] = useState(false);
  const [busy, setBusy] = useState(false);
  const pautan = (typeof window !== "undefined" ? window.location.origin : "") + "/usul-agm/" + (kod ?? "");

  async function salinPautan() {
    try { await navigator.clipboard.writeText(pautan); setSalin(true); setTimeout(() => setSalin(false), 2000); } catch { /* abai */ }
  }
  async function padam(id: string) { setBusy(true); await padamUsulKariah(id); setBusy(false); router.refresh(); }
  async function tukar(id: string, s: "baru" | "diterima" | "ditolak") { setBusy(true); await tukarStatusUsulKariah(id, s); setBusy(false); router.refresh(); }

  return (
    <div className="space-y-5">
      {/* Pautan awam */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-2 font-semibold text-slate-900">Pautan untuk Kariah</h2>
        <p className="mb-2 text-sm text-slate-500">Kongsi pautan ini (WhatsApp / QR). Kariah masukkan IC, maklumat lain dikesan automatik.</p>
        <div className="flex items-center gap-2">
          <input readOnly value={pautan} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-600" />
          <button onClick={salinPautan} className="shrink-0 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900">{salin ? "Disalin ✓" : "Salin"}</button>
        </div>
      </section>

      {/* Senarai usul */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Usul Diterima <span className="text-sm font-normal text-slate-400">({senarai.length})</span></h2>
        {senarai.length === 0 ? (
          <p className="text-sm text-slate-400">Belum ada usul dihantar.</p>
        ) : (
          <div className="space-y-3">
            {senarai.map((u) => {
              const st = STATUS[u.status] ?? STATUS.baru;
              return (
                <div key={u.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{u.nama}</span>
                      {(() => { const t = taraf(u, disahkan); return <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${t.cls}`}>{t.label}</span>; })()}
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
                    </div>
                    <span className="text-xs text-slate-400">{bila(u.dicipta)}</span>
                  </div>
                  <div className="mb-2 text-xs text-slate-500">{u.no_tel || "—"}{u.no_kp ? ` · ${u.no_kp}` : ""}</div>
                  <div className="text-sm text-slate-800"><b>Usul:</b> {u.usul}</div>
                  {u.penjelasan && <div className="mt-1 text-sm text-slate-600"><b>Penjelasan:</b> {u.penjelasan}</div>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button disabled={busy} onClick={() => tukar(u.id, "diterima")} className="rounded-lg border border-emerald-300 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">Terima</button>
                    <button disabled={busy} onClick={() => tukar(u.id, "ditolak")} className="rounded-lg border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Tolak</button>
                    {u.status !== "baru" && <button disabled={busy} onClick={() => tukar(u.id, "baru")} className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50">Reset</button>}
                    <ButangPadam onPadam={() => padam(u.id)} soalan="Padam usul ni?" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
