"use client";

import { useState } from "react";
import { muatTurunAhliLulus } from "@/app/admin/muat-turun-actions";

export default function ButangMuatTurunAhli() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function turun() {
    setBusy(true); setMsg("");
    const r = await muatTurunAhliLulus();
    setBusy(false);
    if (!r.ok || !r.csv) { setMsg(r.msg ?? "Gagal muat turun."); return; }
    try {
      const blob = new Blob([r.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ahli-diluluskan-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg(`${r.bil ?? 0} ahli dimuat turun.`);
    } catch { setMsg("Gagal simpan fail."); }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={turun}
        disabled={busy}
        className="rounded-lg bg-surau px-4 py-2 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-50"
      >
        {busy ? "Menyedia…" : "Muat Turun Ahli Diluluskan (CSV)"}
      </button>
      {msg && <span className="text-xs font-semibold text-slate-600">{msg}</span>}
    </div>
  );
}
