"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tetapkanKaedah, sahkanMaklumat, batalSahMaklumat } from "@/app/admin/keahlianActions";
import { kaedahAhli, medanWajib, semuaWajibAda, statusMaklumat, type Kaedah } from "@/lib/kaedah";

type Ahli = {
  id: string;
  sumber: string | null;
  kaedah: string | null;
  maklumat_disahkan: boolean;
  sah_oleh: string | null;
  sah_tarikh: string | null;
  nama: string | null;
  no_kp: string | null;
  telefon: string | null;
  alamat: string | null;
  alamat_kp: string | null;
};

export default function PengesahanMaklumat({ a }: { a: Ahli }) {
  const router = useRouter();
  const [kaedah, setKaedah] = useState<Kaedah>(kaedahAhli(a.sumber, a.kaedah));
  const [busy, setBusy] = useState(false);
  const [sahMode, setSahMode] = useState(false);
  const [ralat, setRalat] = useState("");

  const m = medanWajib(a);
  const lengkap = semuaWajibAda(a);
  const status = statusMaklumat(a);

  async function tukarKaedah(k: Kaedah) {
    setKaedah(k); setBusy(true); setRalat("");
    const r = await tetapkanKaedah(a.id, k);
    setBusy(false);
    if (r.ok) router.refresh(); else setRalat(r.msg ?? "Gagal simpan kaedah.");
  }
  async function sah() {
    setBusy(true); setRalat("");
    const r = await sahkanMaklumat(a.id);
    setBusy(false); setSahMode(false);
    if (r.ok) router.refresh(); else setRalat(r.msg ?? "Gagal sah.");
  }
  async function batal() {
    setBusy(true); setRalat("");
    const r = await batalSahMaklumat(a.id);
    setBusy(false);
    if (r.ok) router.refresh(); else setRalat(r.msg ?? "Gagal batal.");
  }

  return (
    <section className="rounded-xl border-2 border-surau/30 bg-surau/5 p-5">
      <h2 className="mb-4 font-semibold text-surau">PENGESAHAN MAKLUMAT</h2>

      <label className="block">
        <span className="text-xs font-medium text-slate-600">Kaedah</span>
        <select value={kaedah} onChange={(e) => tukarKaedah(e.target.value as Kaedah)} disabled={busy}
          className="mt-1 block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="gform">Google Form</option>
          <option value="fizikal">Borang Fizikal</option>
        </select>
      </label>

      <div className="my-4 h-px bg-slate-200" />

      <div className="mb-3">
        <span className="text-xs font-medium text-slate-600">Kelengkapan maklumat</span>
        <div className="mt-2 grid max-w-md gap-x-6 gap-y-1 sm:grid-cols-2">
          <Baris label="Nama" ada={m.nama} />
          <Baris label="No IC" ada={m.no_kp} />
          <Baris label="Telefon" ada={m.telefon} />
          <Baris label="Alamat" ada={m.alamat} />
        </div>
      </div>

      {a.maklumat_disahkan ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Sah</span>
          {(a.sah_oleh || a.sah_tarikh) && (
            <span className="text-xs text-slate-500">disahkan {a.sah_oleh ?? ""}{a.sah_tarikh ? ` · ${a.sah_tarikh}` : ""}</span>
          )}
          <button onClick={batal} disabled={busy} className="text-xs font-medium text-slate-400 hover:text-red-500 hover:underline disabled:opacity-50">batal sah</button>
        </div>
      ) : lengkap ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">Perlu semak</span>
          {sahMode ? (
            <span className="inline-flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Sah maklumat?</span>
              <button onClick={sah} disabled={busy} className="rounded-md bg-green-600 px-3 py-1 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50">Ya</button>
              <button onClick={() => setSahMode(false)} disabled={busy} className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50">Tak</button>
            </span>
          ) : (
            <button onClick={() => setSahMode(true)} className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-green-700">Sah maklumat</button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">Tak lengkap</span>
          <button disabled className="cursor-not-allowed rounded-lg bg-slate-200 px-4 py-1.5 text-xs font-bold text-slate-400">Sah maklumat</button>
        </div>
      )}
      {ralat && <p className="mt-2 text-xs font-semibold text-red-600">{ralat}</p>}
    </section>
  );
}

function Baris({ label, ada }: { label: string; ada: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1 text-sm">
      <span className="text-slate-700">{label}</span>
      <span className={`text-xs font-bold ${ada ? "text-green-600" : "text-red-600"}`}>{ada ? "Ada" : "Tiada"}</span>
    </div>
  );
}
