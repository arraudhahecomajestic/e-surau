"use client";

import { useRouter } from "next/navigation";
import { tukarStatusJawatan, padamJawatan, tukarStatusPermohonan, padamPermohonan } from "@/app/admin/kerjaya/actions";
import { STATUS_JAWATAN, STATUS_PERMOHONAN } from "@/lib/kerjaya";

export function JawatanKawalan({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select defaultValue={status} onChange={async (e) => { await tukarStatusJawatan(id, e.target.value); router.refresh(); }}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
        {STATUS_JAWATAN.map((s) => <option key={s.kod} value={s.kod}>Status: {s.label}</option>)}
      </select>
      <a href={`/kerjaya/${id}`} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Lihat halaman awam ↗</a>
      <button onClick={async () => { if (confirm("Padam iklan jawatan ini & semua permohonan?")) { await padamJawatan(id); router.push("/admin/kerjaya"); } }}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50">Padam Jawatan</button>
    </div>
  );
}

export function StatusPermohonan({ id, jawatanId, status }: { id: string; jawatanId: string; status: string }) {
  const router = useRouter();
  return (
    <select defaultValue={status} onChange={async (e) => { await tukarStatusPermohonan(id, jawatanId, e.target.value); router.refresh(); }}
      className="rounded-lg border border-slate-300 px-2 py-1 text-xs">
      {STATUS_PERMOHONAN.map((s) => <option key={s.kod} value={s.kod}>{s.label}</option>)}
    </select>
  );
}

export function PadamPermohonanButton({ id, jawatanId }: { id: string; jawatanId: string }) {
  const router = useRouter();
  return (
    <button onClick={async () => { if (confirm("Padam permohonan ini?")) { await padamPermohonan(id, jawatanId); router.refresh(); } }}
      className="text-xs font-semibold text-red-500 hover:underline">Padam</button>
  );
}
