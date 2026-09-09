"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { simpanAgm, tandaHadir, padamHadir, tambahUsul, kemasUndi, padamUsul, tetapkanDaftarBuka, sahkanHadir } from "@/app/admin/agm/actions";
import QrDaftar from "@/components/QrDaftar";

type Agm = { id: string; tajuk: string; tahun: number; tarikh: string | null; masa: string | null; tempat: string | null; kuorum: number; atur_cara: string | null; status: string; kod?: string | null; daftar_buka?: boolean };
type Hadir = { id: string; ahli_id: string | null; nama: string; no_ahli: string | null; no_kp?: string | null; kaedah?: string | null; perlu_semak?: boolean; masa_daftar: string };
type Usul = { id: string; no: number; tajuk: string; keterangan: string | null; undi_setuju: number; undi_tolak: number; undi_berkecuali: number; keputusan: string | null; catatan: string | null };
type Ahli = { id: string; no_ahli: string | null; nama: string };

export default function AgmPanel({ agm, hadir, usul, ahli, tahunLalai }: { agm: Agm | null; hadir: Hadir[]; usul: Usul[]; ahli: Ahli[]; tahunLalai: number }) {
  return (
    <div className="space-y-6">
      <MaklumatAgm agm={agm} tahunLalai={tahunLalai} />
      {agm && <DaftarHadir agm={agm} hadir={hadir} ahli={ahli} />}
      {agm && <UsulUndian agm={agm} usul={usul} />}
    </div>
  );
}

/* ============ 1) MAKLUMAT AGM ============ */
function MaklumatAgm({ agm, tahunLalai }: { agm: Agm | null; tahunLalai: number }) {
  const router = useRouter();
  const [edit, setEdit] = useState(!agm);
  const [busy, setBusy] = useState(false);
  const [ralat, setRalat] = useState("");
  const [ok, setOk] = useState(false);

  async function hantar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setRalat(""); setOk(false);
    const fd = new FormData(e.currentTarget);
    const r = await simpanAgm(fd);
    setBusy(false);
    if (r?.ok) { setOk(true); setEdit(false); router.refresh(); setTimeout(() => setOk(false), 2500); }
    else setRalat(r?.msg ?? "Gagal simpan. Cuba lagi.");
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Maklumat Mesyuarat</h2>
        <div className="flex items-center gap-2">
          {ok && <span className="text-xs font-semibold text-emerald-600">✓ Disimpan</span>}
          {agm && !edit && <button onClick={() => setEdit(true)} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Edit</button>}
        </div>
      </div>

      {agm && !edit ? (
        <div className="space-y-1 text-sm text-slate-700">
          <div className="text-lg font-bold text-slate-900">{agm.tajuk} {agm.tahun}</div>
          <div><span className="text-slate-400">Tarikh:</span> {agm.tarikh ?? "—"} {agm.masa ? `· ${agm.masa}` : ""}</div>
          <div><span className="text-slate-400">Tempat:</span> {agm.tempat ?? "—"}</div>
          <div><span className="text-slate-400">Kuorum diperlukan:</span> <b>{agm.kuorum || "—"}</b></div>
          <div>Status: <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold">{agm.status}</span></div>
          {agm.atur_cara && <div className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs">{agm.atur_cara}</div>}
        </div>
      ) : (
        <form onSubmit={hantar} className="space-y-3">
          {agm && <input type="hidden" name="id" value={agm.id} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2"><span className="text-xs font-medium text-slate-600">Tajuk</span>
              <input name="tajuk" defaultValue={agm?.tajuk ?? "Mesyuarat Agung Kariah"} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="block"><span className="text-xs font-medium text-slate-600">Tahun</span>
              <input name="tahun" type="number" defaultValue={agm?.tahun ?? tahunLalai} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="block"><span className="text-xs font-medium text-slate-600">Tarikh</span>
              <input name="tarikh" type="date" defaultValue={agm?.tarikh ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="block"><span className="text-xs font-medium text-slate-600">Masa</span>
              <input name="masa" defaultValue={agm?.masa ?? ""} placeholder="cth: 9:00 pagi" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="block"><span className="text-xs font-medium text-slate-600">Kuorum (bilangan ahli)</span>
              <input name="kuorum" type="number" min={0} defaultValue={agm?.kuorum ?? 0} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="block sm:col-span-2"><span className="text-xs font-medium text-slate-600">Tempat</span>
              <input name="tempat" defaultValue={agm?.tempat ?? ""} placeholder="cth: Ruang Solat Utama, Surau Ar-Raudhah" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="block"><span className="text-xs font-medium text-slate-600">Status</span>
              <select name="status" defaultValue={agm?.status ?? "akan_datang"} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="akan_datang">Akan datang</option>
                <option value="sedang">Sedang berlangsung</option>
                <option value="selesai">Selesai</option>
              </select></label>
            <label className="block sm:col-span-2"><span className="text-xs font-medium text-slate-600">Atur cara / Nota</span>
              <textarea name="atur_cara" rows={3} defaultValue={agm?.atur_cara ?? ""} placeholder="Atur cara majlis, agenda ringkas, dll." className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" disabled={busy} className="rounded-lg bg-surau px-5 py-2 text-sm font-bold text-white hover:bg-surau-dark disabled:opacity-50">{busy ? "Menyimpan…" : "Simpan"}</button>
            {agm && <button type="button" onClick={() => { setEdit(false); setRalat(""); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600">Batal</button>}
            {ralat && <span className="text-xs font-semibold text-red-600">{ralat}</span>}
          </div>
        </form>
      )}
    </section>
  );
}

/* ============ 2) DAFTAR HADIR & KUORUM ============ */
function DaftarHadir({ agm, hadir, ahli }: { agm: Agm; hadir: Hadir[]; ahli: Ahli[] }) {
  const router = useRouter();
  const [cari, setCari] = useState("");
  const [nama, setNama] = useState("");
  const [busy, setBusy] = useState(false);
  const [ralat, setRalat] = useState("");
  const sudah = useMemo(() => new Set(hadir.map((h) => h.ahli_id).filter(Boolean) as string[]), [hadir]);
  const padanan = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return [] as Ahli[];
    return ahli.filter((a) => a.nama.toLowerCase().includes(q) || (a.no_ahli ?? "").toLowerCase().includes(q)).slice(0, 8);
  }, [cari, ahli]);

  const capai = agm.kuorum > 0 && hadir.length >= agm.kuorum;

  async function daftar(a: Ahli) {
    setBusy(true); setRalat("");
    const r = await tandaHadir(agm.id, a.id, a.nama, a.no_ahli); setBusy(false);
    if (r?.ok) { setCari(""); router.refresh(); } else setRalat(r?.msg ?? "Gagal daftar.");
  }
  async function daftarWalkIn() {
    if (!nama.trim()) return;
    setBusy(true); setRalat("");
    const r = await tandaHadir(agm.id, null, nama, null); setBusy(false);
    if (r?.ok) { setNama(""); router.refresh(); } else setRalat(r?.msg ?? "Gagal daftar.");
  }
  async function buang(id: string) { setBusy(true); await padamHadir(id); setBusy(false); router.refresh(); }
  async function toggleDaftar() {
    setBusy(true); setRalat("");
    const r = await tetapkanDaftarBuka(agm.id, !agm.daftar_buka); setBusy(false);
    if (r?.ok) router.refresh(); else setRalat(r?.msg ?? "Gagal tukar status daftar.");
  }
  async function sahkan(id: string) { setBusy(true); await sahkanHadir(id); setBusy(false); router.refresh(); }

  const bilSemak = hadir.filter((h) => h.perlu_semak).length;
  const bilAhli = hadir.filter((h) => h.ahli_id).length;
  const bilLuar = hadir.filter((h) => !h.ahli_id && !h.perlu_semak).length;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">Daftar Kehadiran &amp; Kuorum</h2>
        <div className={`rounded-lg px-3 py-1.5 text-sm font-bold ${capai ? "bg-green-100 text-green-700" : agm.kuorum > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
          Hadir: {hadir.length}{agm.kuorum > 0 ? ` / ${agm.kuorum}` : ""} {agm.kuorum > 0 && (capai ? "· Kuorum CUKUP ✓" : "· belum cukup")}
        </div>
      </div>

      {/* Kawalan QR check-in */}
      <div className="mb-4 rounded-xl border border-slate-200 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-slate-800">Daftar Hadir Sendiri (QR)</div>
            <div className="text-xs text-slate-500">
              Status: {agm.daftar_buka
                ? <span className="font-semibold text-green-600">DIBUKA — ahli boleh imbas & daftar</span>
                : <span className="font-semibold text-slate-500">DITUTUP</span>}
            </div>
          </div>
          <button onClick={toggleDaftar} disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${agm.daftar_buka ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}>
            {agm.daftar_buka ? "Tutup Daftar" : "Buka Daftar"}
          </button>
        </div>
        {agm.daftar_buka && agm.kod && <div className="mt-3"><QrDaftar kod={agm.kod} /></div>}
      </div>

      {bilSemak > 0 && (
        <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {bilSemak} orang daftar guna IC yang belum dikemas kini dalam sistem (pendaftar 2025). Mereka dikira hadir &amp; layak mengundi — tandakan “Sah” selepas disemak.
        </div>
      )}

      {/* Carian ahli */}
      <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari ahli (nama / no. ahli) untuk daftar hadir…" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      {padanan.length > 0 && (
        <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {padanan.map((a) => {
            const dah = sudah.has(a.id);
            return (
              <div key={a.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0"><div className="truncate text-sm font-medium text-slate-800">{a.nama}</div><div className="text-xs text-slate-400">{a.no_ahli ?? "—"}</div></div>
                {dah ? <span className="text-xs font-semibold text-green-600">✓ Hadir</span>
                  : <button disabled={busy} onClick={() => daftar(a)} className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">+ Hadir</button>}
              </div>
            );
          })}
        </div>
      )}

      {/* Walk-in */}
      <div className="mt-3 flex gap-2">
        <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Atau daftar nama luar (walk-in)…" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button disabled={busy} onClick={daftarWalkIn} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50">Tambah</button>
      </div>
      {ralat && <p className="mt-2 text-xs font-semibold text-red-600">{ralat}</p>}

      {/* Senarai hadir */}
      <div className="mt-4">
        <div className="mb-1 text-xs font-semibold text-slate-500">Senarai hadir ({hadir.length}) <span className="font-normal text-slate-400">· ahli berdaftar {bilAhli} · 2025 {bilSemak} · luar {bilLuar}</span></div>
        {hadir.length === 0 ? <p className="text-sm text-slate-400">Belum ada yang didaftar.</p> : (
          <ol className="divide-y divide-slate-100 rounded-lg border border-slate-100 text-sm">
            {hadir.map((h, i) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                <span className="flex min-w-0 flex-wrap items-center gap-x-2">
                  <span className="text-slate-400">{i + 1}.</span>
                  <span className="truncate">{h.nama}</span>
                  {h.no_ahli && <span className="text-xs text-slate-400">{h.no_ahli}</span>}
                  {h.kaedah === "qr" && <span className="rounded bg-blue-50 px-1.5 text-[10px] text-blue-600">QR</span>}
                  {h.perlu_semak && <span className="rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700">2025 · perlu semak</span>}
                  {!h.ahli_id && !h.perlu_semak && <span className="rounded bg-slate-100 px-1.5 text-[10px] text-slate-500">luar</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {h.perlu_semak && <button onClick={() => sahkan(h.id)} className="text-xs font-semibold text-green-600 hover:underline">sah</button>}
                  <button onClick={() => buang(h.id)} className="text-xs text-red-500 hover:underline">padam</button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

/* ============ 3) USUL & UNDIAN ============ */
function UsulUndian({ agm, usul }: { agm: Agm; usul: Usul[] }) {
  const router = useRouter();
  const [tajuk, setTajuk] = useState("");
  const [ket, setKet] = useState("");
  const [busy, setBusy] = useState(false);
  const [ralat, setRalat] = useState("");

  async function tambah() {
    if (!tajuk.trim()) { setRalat("Sila isi tajuk usul dahulu."); return; }
    setBusy(true); setRalat("");
    const r = await tambahUsul(agm.id, tajuk, ket); setBusy(false);
    if (r?.ok) { setTajuk(""); setKet(""); router.refresh(); } else setRalat(r?.msg ?? "Gagal tambah usul.");
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-semibold text-slate-900">Usul &amp; Undian</h2>

      <div className="mb-4 space-y-2 rounded-lg bg-slate-50 p-3">
        <input value={tajuk} onChange={(e) => setTajuk(e.target.value)} placeholder="Tajuk usul baharu (cth: Luluskan Belanjawan 2027)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <textarea value={ket} onChange={(e) => setKet(e.target.value)} rows={2} placeholder="Keterangan (pilihan)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button disabled={busy} onClick={tambah} className="rounded-lg bg-surau px-4 py-2 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-50">{busy ? "Menambah…" : "+ Tambah Usul"}</button>
        {ralat && <p className="text-xs font-semibold text-red-600">{ralat}</p>}
      </div>

      {usul.length === 0 ? <p className="text-sm text-slate-400">Belum ada usul.</p> : (
        <div className="space-y-3">{usul.map((u) => <UsulRow key={u.id} u={u} onDone={() => router.refresh()} />)}</div>
      )}
    </section>
  );
}

function UsulRow({ u, onDone }: { u: Usul; onDone: () => void }) {
  const [s, setS] = useState(u.undi_setuju);
  const [t, setT] = useState(u.undi_tolak);
  const [b, setB] = useState(u.undi_berkecuali);
  const [kep, setKep] = useState(u.keputusan ?? "");
  const [cat, setCat] = useState(u.catatan ?? "");
  const [busy, setBusy] = useState(false);
  const [buka, setBuka] = useState(false);
  const [ralat, setRalat] = useState("");

  const badge = (k: string | null) => {
    if (k === "lulus") return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">LULUS</span>;
    if (k === "tolak") return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">TOLAK</span>;
    if (k === "tangguh") return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">TANGGUH</span>;
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">belum undi</span>;
  };

  async function simpan() {
    setBusy(true); setRalat("");
    const r = await kemasUndi(u.id, s, t, b, kep, cat); setBusy(false);
    if (r?.ok) { setBuka(false); onDone(); } else setRalat(r?.msg ?? "Gagal simpan undi.");
  }
  async function padam() { if (!window.confirm("Padam usul ini?")) return; setBusy(true); await padamUsul(u.id); setBusy(false); onDone(); }

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">Usul {u.no}: {u.tajuk}</div>
          {u.keterangan && <div className="mt-0.5 text-xs text-slate-500">{u.keterangan}</div>}
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
            {badge(u.keputusan)}
            <span>Setuju {u.undi_setuju} · Tolak {u.undi_tolak} · Berkecuali {u.undi_berkecuali}</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => setBuka((v) => !v)} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">{buka ? "Tutup" : "Undi"}</button>
        </div>
      </div>

      {buka && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="grid grid-cols-3 gap-2">
            <label className="block"><span className="text-xs font-medium text-green-700">Setuju</span>
              <input type="number" min={0} value={s} onChange={(e) => setS(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
            <label className="block"><span className="text-xs font-medium text-red-700">Tolak</span>
              <input type="number" min={0} value={t} onChange={(e) => setT(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
            <label className="block"><span className="text-xs font-medium text-slate-500">Berkecuali</span>
              <input type="number" min={0} value={b} onChange={(e) => setB(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="block"><span className="text-xs font-medium text-slate-600">Keputusan</span>
              <select value={kep} onChange={(e) => setKep(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                <option value="">Auto (ikut undi)</option>
                <option value="lulus">Lulus</option>
                <option value="tolak">Tolak</option>
                <option value="tangguh">Tangguh</option>
              </select></label>
            <label className="block"><span className="text-xs font-medium text-slate-600">Catatan</span>
              <input value={cat} onChange={(e) => setCat(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
          </div>
          <div className="mt-3 flex gap-2">
            <button disabled={busy} onClick={simpan} className="rounded-lg bg-surau px-4 py-1.5 text-xs font-bold text-white hover:bg-surau-dark disabled:opacity-50">{busy ? "Menyimpan…" : "Simpan Undi"}</button>
            <button disabled={busy} onClick={padam} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50">Padam usul</button>
            {ralat && <span className="self-center text-xs font-semibold text-red-600">{ralat}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
