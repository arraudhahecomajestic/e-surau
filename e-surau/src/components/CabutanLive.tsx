"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { namaKemas } from "@/lib/format";
import { cabutPemenang, padamPemenangCabutan } from "@/app/admin/program/actions";

type Calon = { id: string; nama: string; telefon: string | null; hadir: boolean };
type Pemenang = { id: string; nama: string; telefon: string | null; hadiah: string | null };

export default function CabutanLive({
  programId,
  tajuk,
  calon,
  pemenangAwal,
}: {
  programId: string;
  tajuk: string;
  calon: Calon[];
  pemenangAwal: Pemenang[];
}) {
  const router = useRouter();
  const [hanyaHadir, setHanyaHadir] = useState(false);
  const [hadiah, setHadiah] = useState("");
  const [pusing, setPusing] = useState(false);
  const [papar, setPapar] = useState<string>("—");
  const [menang, setMenang] = useState<Pemenang | null>(null);
  const [ralat, setRalat] = useState("");
  const [senarai, setSenarai] = useState<Pemenang[]>(pemenangAwal);
  const timerRef = useRef<any>(null);

  const sudahMenang = new Set(senarai.map((p) => p.id));
  // Anggaran calon layak untuk kiraan (tepat dikira di server).
  const calonPapar = calon.filter((c) => (!hanyaHadir || c.hadir));
  const bakiAnggar = calonPapar.length - senarai.filter((p) => true).length;

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  async function cabut() {
    if (pusing) return;
    setRalat(""); setMenang(null); setPusing(true);

    // Mula animasi nama berpusing
    const namaCycle = calonPapar.length ? calonPapar : calon;
    timerRef.current = setInterval(() => {
      const r = namaCycle[Math.floor(Math.random() * namaCycle.length)];
      setPapar(r ? namaKemas(r.nama) : "…");
    }, 60);

    // Panggil server (pilih & rekod pemenang) serentak dengan animasi
    const [res] = await Promise.all([
      cabutPemenang({ programId, hanyaHadir, hadiah }),
      new Promise((r) => setTimeout(r, 2600)), // biar animasi berpusing ~2.6s
    ]);

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    if (!res.ok || !res.pemenang) {
      setPusing(false);
      setPapar("—");
      setRalat(res.msg ?? "Cabutan gagal.");
      return;
    }
    const p = res.pemenang;
    setPapar(namaKemas(p.nama));
    setMenang(p);
    setSenarai((s) => [p, ...s]);
    setPusing(false);
  }

  async function padam(id: string) {
    if (!window.confirm("Padam pemenang ini? Dia akan layak dicabut semula.")) return;
    const fd = new FormData();
    fd.set("id", id);
    fd.set("program_id", programId);
    await padamPemenangCabutan(fd);
    setSenarai((s) => s.filter((p) => p.id !== id));
    if (menang?.id === id) { setMenang(null); setPapar("—"); }
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-surau-dark to-slate-900 px-4 py-6 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <div className="text-sm font-semibold uppercase tracking-widest text-amber-300">Cabutan Bertuah</div>
          <h1 className="mt-1 text-2xl font-bold">{tajuk}</h1>
          <div className="mt-1 text-sm text-white/60">{calonPapar.length} calon{hanyaHadir ? " (yang check-in)" : " (RSVP)"} · {senarai.length} sudah menang</div>
        </div>

        {/* Kawalan */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-xl bg-white/10 p-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hanyaHadir} disabled={pusing} onChange={(e) => setHanyaHadir(e.target.checked)} className="h-4 w-4 accent-amber-400" />
            Hanya yang check-in (hadir)
          </label>
          <input
            value={hadiah}
            onChange={(e) => setHadiah(e.target.value)}
            disabled={pusing}
            placeholder="Nama hadiah (cth: Hamper Raya)"
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 outline-none focus:border-amber-300"
          />
        </div>

        {/* Papar nama besar */}
        <div className="relative mt-6 flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-amber-300/40 bg-black/20 p-6 text-center">
          {menang && !pusing && <div className="absolute left-0 right-0 top-3 text-4xl">🎉🎉🎉</div>}
          <div className={`px-2 text-4xl font-extrabold leading-tight sm:text-5xl ${pusing ? "opacity-70 blur-[1px]" : "text-amber-300"} transition`}>
            {papar}
          </div>
          {menang && !pusing && (
            <div className="mt-3 text-sm text-white/80">
              {menang.hadiah ? <span className="rounded-full bg-amber-400/20 px-3 py-1 font-semibold text-amber-200">{menang.hadiah}</span> : null}
              {menang.telefon ? <span className="ml-2 font-mono text-white/60">{menang.telefon}</span> : null}
            </div>
          )}
          {menang && !pusing && <div className="absolute bottom-3 left-0 right-0 text-4xl">🎊🎊🎊</div>}
        </div>

        {ralat && <div className="mt-3 rounded-lg bg-red-500/20 p-3 text-center text-sm text-red-100">{ralat}</div>}

        {/* Butang cabut */}
        <div className="mt-6 text-center">
          <button
            onClick={cabut}
            disabled={pusing}
            className="rounded-2xl bg-amber-400 px-10 py-4 text-lg font-extrabold text-slate-900 shadow-lg transition hover:bg-amber-300 disabled:opacity-60"
          >
            {pusing ? "Mencabut…" : "🎯 CABUT PEMENANG"}
          </button>
        </div>

        {/* Senarai pemenang */}
        {senarai.length > 0 && (
          <div className="mt-8 rounded-xl bg-white/5 p-4">
            <div className="mb-2 text-sm font-semibold text-amber-300">Senarai Pemenang ({senarai.length})</div>
            <ol className="space-y-1.5">
              {senarai.map((p, i) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm">
                  <span>
                    <span className="mr-2 text-white/50">{senarai.length - i}.</span>
                    <span className="font-semibold">{namaKemas(p.nama)}</span>
                    {p.hadiah && <span className="ml-2 text-amber-200">· {p.hadiah}</span>}
                    {p.telefon && <span className="ml-2 font-mono text-white/40">{p.telefon}</span>}
                  </span>
                  <button onClick={() => padam(p.id)} className="text-xs text-white/40 hover:text-red-300">Padam</button>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-white/40">Padam pemenang untuk cabut semula (cth kalau tak hadir masa nama dipanggil).</p>
          </div>
        )}
      </div>
    </div>
  );
}
