"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Waktu = { nama: string; masa: string }; // masa "HH:MM"

const HIJRI_BULAN = ["Muharram", "Safar", "Rabiulawal", "Rabiulakhir", "Jamadilawal", "Jamadilakhir", "Rejab", "Syaaban", "Ramadan", "Syawal", "Zulkaedah", "Zulhijjah"];
const HARI = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
const BULAN_PENDEK = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogos", "Sep", "Okt", "Nov", "Dis"];
const AZAN_WAKTU = new Set(["Subuh", "Zohor", "Asar", "Maghrib", "Isyak"]); // Syuruk tiada azan

// Tukar "HH:MM" (24j) → 12 jam tanpa AM/PM (cth "13:14" → "1:14")
function to12(masa: string): string {
  const [h, m] = masa.split(":").map(Number);
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")}`;
}

// Tema warna paparan (literal penuh supaya Tailwind JIT ambil semasa build)
const TEMA_BG: Record<string, string> = {
  hijau: "from-emerald-950 via-emerald-900 to-slate-900",
  gelap: "from-slate-950 via-slate-900 to-black",
  biru: "from-blue-950 via-blue-900 to-slate-900",
  ungu: "from-indigo-950 via-purple-900 to-slate-900",
  sejuk: "from-teal-950 via-cyan-900 to-slate-900",
};

function isVideoUrl(u: string): boolean {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(u);
}
function klNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
}
function minitDari(masa: string) {
  const [h, m] = masa.split(":").map(Number);
  return h * 60 + m;
}
function hijriText(d: Date): string {
  try {
    const p = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "numeric", month: "numeric", year: "numeric" }).formatToParts(d);
    const g = (t: string) => Number(p.find((x) => x.type === t)?.value || 0);
    const hari = g("day"), bln = g("month"), thn = g("year");
    return `${hari} ${HIJRI_BULAN[(bln - 1 + 12) % 12]} ${thn}H`;
  } catch {
    return "";
  }
}

export default function PaparanTV({
  zon,
  namaSurau,
  posterUrls = [],
  iqamahMinit = 10,
  tempohSaat = 15,
  azanAktif = true,
  teks = "",
  tema = "hijau",
  posterIsi = "muat",
  posterMod = "sambung",
  iqamahGaya = "klasik",
  pratonton = false,
}: {
  zon: string;
  namaSurau: string;
  posterUrls?: string[];
  iqamahMinit?: number;
  tempohSaat?: number;
  azanAktif?: boolean;
  teks?: string;
  tema?: string;
  posterIsi?: string;
  posterMod?: string; // "sambung" (poster je) | "selang" (selang jam)
  iqamahGaya?: string; // "klasik" | "besar" | "kaligrafi"
  pratonton?: boolean;
}) {
  const [mula, setMula] = useState(pratonton);
  const [now, setNow] = useState<Date>(() => klNow());
  const [waktu, setWaktu] = useState<Waktu[]>([]);
  const [scene, setScene] = useState(0);
  const [posterIdx, setPosterIdx] = useState(0);
  const [mode, setMode] = useState<"normal" | "azan" | "iqamah" | "solat">("normal");
  const [iqamahBaki, setIqamahBaki] = useState(0);
  const [waktuAzan, setWaktuAzan] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const acRef = useRef<any>(null);
  const triggeredRef = useRef<Set<string>>(new Set());
  const iqamahTamatRef = useRef<number>(0); // ms epoch bila iqamah patut habis (masuk waktu + iqamahMinit)

  const bgTema = TEMA_BG[tema] ?? TEMA_BG.hijau;
  const azanBoleh = azanAktif && !pratonton;
  const posters = useMemo(() => (posterUrls || []).filter(Boolean), [posterUrls]);

  // Teks berjalan — hanya teks yang ditaip di panel Paparan (bebas).
  const scrollerText = useMemo(() => {
    const t = (teks || "").trim();
    return t || `Selamat datang ke ${namaSurau}`;
  }, [teks, namaSurau]);

  // Scene semasa:
  //  - tiada poster → jam
  //  - "sambung" → poster sahaja (rotate satu demi satu, tanpa jam)
  //  - "selang"  → jam ↔ poster berselang
  const sceneKini = useMemo(() => {
    if (!posters.length) return "jam";
    if (posterMod === "selang") return scene % 2 === 1 ? "poster" : "jam";
    return "poster";
  }, [posters.length, posterMod, scene]);

  // Jam tick setiap saat
  useEffect(() => {
    if (!mula) return;
    const t = setInterval(() => setNow(klNow()), 1000);
    return () => clearInterval(t);
  }, [mula]);

  // Ambil waktu solat + refresh tiap jam
  const ambilWaktu = useCallback(async () => {
    try {
      const r = await fetch(`/api/waktu-solat?zon=${encodeURIComponent(zon)}`);
      const d = await r.json();
      if (d?.ok && Array.isArray(d.waktu)) setWaktu(d.waktu);
    } catch { /* abai */ }
  }, [zon]);
  useEffect(() => {
    if (!mula) return;
    ambilWaktu();
    const t = setInterval(ambilWaktu, 3600 * 1000);
    return () => clearInterval(t);
  }, [mula, ambilWaktu]);

  // Rotasi scene (bila mode normal)
  useEffect(() => {
    if (!mula || mode !== "normal") return;
    if (!posters.length) return;
    const jeda = Math.max(5, tempohSaat) * 1000;
    const t = setInterval(() => {
      if (posterMod === "selang") {
        // jam ↔ poster; tukar poster hanya bila beralih ke scene poster
        setScene((s) => {
          const ns = (s + 1) % 2;
          if (ns === 1) setPosterIdx((p) => (p + 1) % posters.length);
          return ns;
        });
      } else {
        // sambung: poster demi poster
        setPosterIdx((p) => (p + 1) % posters.length);
      }
    }, jeda);
    return () => clearInterval(t);
  }, [mula, mode, posters.length, tempohSaat, posterMod]);

  const jamStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const saatStr = String(now.getSeconds()).padStart(2, "0");
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const waktuSeterusnya = useMemo(() => {
    const akan = waktu.filter((w) => AZAN_WAKTU.has(w.nama) && minitDari(w.masa) > nowMin);
    return akan.length ? akan[0] : (waktu.find((w) => AZAN_WAKTU.has(w.nama)) ?? null);
  }, [waktu, nowMin]);

  // Senarai untuk jalur bawah: tambah Imsak (Subuh − 10 min) di hadapan.
  const barWaktu = useMemo(() => {
    const list: { nama: string; masa: string; imsak?: boolean }[] = [];
    const subuh = waktu.find((w) => w.nama === "Subuh");
    if (subuh) {
      const im = ((minitDari(subuh.masa) - 10) % 1440 + 1440) % 1440;
      list.push({ nama: "Imsak", masa: `${String(Math.floor(im / 60)).padStart(2, "0")}:${String(im % 60).padStart(2, "0")}`, imsak: true });
    }
    for (const w of waktu) list.push({ nama: w.nama, masa: w.masa });
    return list;
  }, [waktu]);

  // Kiraan mengundur ke waktu solat seterusnya (HH:MM:SS)
  const kiraMasukWaktu = useMemo(() => {
    if (!waktuSeterusnya) return "";
    const [h, m] = waktuSeterusnya.masa.split(":").map(Number);
    const nowS = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    let baki = h * 3600 + m * 60 - nowS;
    if (baki < 0) baki += 86400; // waktu esok (cth selepas Isyak → Subuh)
    const jj = Math.floor(baki / 3600);
    const mm = Math.floor((baki % 3600) / 60);
    const ss = baki % 60;
    return `${String(jj).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }, [waktuSeterusnya, now]);

  // ---- AUDIO ----
  function beep(freq = 880, ms = 250) {
    try {
      const ac = acRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      acRef.current = ac;
      const o = ac.createOscillator(); const g = ac.createGain();
      o.frequency.value = freq; o.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + ms / 1000);
      o.start(); o.stop(ac.currentTime + ms / 1000);
    } catch { /* abai */ }
  }
  function mainAzan(subuh: boolean) {
    const a = audioRef.current;
    if (a) {
      a.src = subuh ? "/azan-subuh.mp3" : "/azan.mp3";
      a.currentTime = 0;
      a.play().catch(() => { beep(700, 600); });
    } else {
      beep(700, 600);
    }
  }

  // ---- Trigger azan bila masuk waktu ----
  useEffect(() => {
    if (!mula || mode !== "normal" || !waktu.length) return;
    if (!azanBoleh) return;
    if (now.getSeconds() !== 0) return;
    const kunciHari = now.toDateString();
    for (const w of waktu) {
      if (!AZAN_WAKTU.has(w.nama)) continue;
      if (w.masa === jamStr) {
        const key = `${kunciHari}-${w.nama}`;
        if (triggeredRef.current.has(key)) continue;
        triggeredRef.current.add(key);
        setWaktuAzan(w.nama);
        // Masuk waktu → TERUS mula countdown iqamah (10 min dari masuk waktu),
        // azan main serentak. Tak perlu klik manual, tak tersangkut walau tiada mp3.
        iqamahTamatRef.current = Date.now() + iqamahMinit * 60000;
        setIqamahBaki(iqamahMinit * 60);
        setMode("iqamah");
        mainAzan(w.nama === "Subuh");
      }
    }
  }, [now, mula, mode, waktu, jamStr, azanBoleh, iqamahMinit]);

  // Countdown iqamah — undur ke sasaran (masuk waktu + iqamahMinit) → SOLAT.
  useEffect(() => {
    if (mode !== "iqamah") return;
    if (iqamahBaki <= 0) {
      try { audioRef.current?.pause(); } catch { /* */ }
      beep(880, 500); setTimeout(() => beep(880, 500), 600);
      setMode("solat"); setTimeout(() => setMode("normal"), 90000);
      return;
    }
    // Segerakkan dengan jam sebenar (elak hanyut jika tab tidur)
    const t = setTimeout(() => {
      const baki = Math.max(0, Math.round((iqamahTamatRef.current - Date.now()) / 1000));
      setIqamahBaki(baki);
    }, 1000);
    return () => clearTimeout(t);
  }, [mode, iqamahBaki]);

  // Minta skrin penuh (butang — sesuai remote TV, tak perlu F11)
  function mintaFullscreen() {
    try {
      const el: any = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (req && !document.fullscreenElement) req.call(el);
    } catch { /* abai */ }
  }

  // ====== SKRIN MULA (unlock audio + skrin penuh) ======
  if (!mula) {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center bg-gradient-to-b ${bgTema} text-center text-white`}>
        <div className="text-2xl font-bold text-amber-300">{namaSurau}</div>
        <div className="mt-2 text-sm text-white/60">Mod Paparan TV</div>
        <button
          onClick={() => {
            try { const ac = new (window.AudioContext || (window as any).webkitAudioContext)(); acRef.current = ac; ac.resume?.(); } catch { /* */ }
            if (audioRef.current) { audioRef.current.play().then(() => audioRef.current?.pause()).catch(() => {}); }
            mintaFullscreen();
            setMula(true);
          }}
          className="mt-8 rounded-2xl bg-amber-400 px-10 py-5 text-xl font-extrabold text-slate-900 shadow-lg hover:bg-amber-300"
        >
          ▶ Sentuh untuk Mula (Skrin Penuh)
        </button>
        <p className="mt-4 max-w-md px-6 text-xs text-white/50">Tekan sekali guna remote/tetikus TV — skrin terus penuh &amp; bunyi azan dibenarkan. Selepas itu berjalan automatik.</p>
        <audio ref={audioRef} preload="auto" />
      </div>
    );
  }

  const dHari = HARI[now.getDay()];
  const dTarikhPendek = `${dHari}, ${now.getDate()} ${BULAN_PENDEK[now.getMonth()]} ${now.getFullYear()}`;
  const dHijri = hijriText(now);
  // Jam 12 jam + AM/PM (untuk jalur bawah)
  const jam12 = now.getHours() % 12 === 0 ? 12 : now.getHours() % 12;
  const ampm = now.getHours() >= 12 ? "PM" : "AM";
  const jamPapar = `${jam12}:${String(now.getMinutes()).padStart(2, "0")}:${saatStr}`;

  return (
    <div className={`relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b ${bgTema} text-white ${pratonton ? "" : "cursor-none"}`}>
      <audio ref={audioRef} preload="auto" />

      {!pratonton && (
        <button
          onClick={mintaFullscreen}
          title="Skrin penuh"
          className="absolute right-3 top-3 z-20 rounded-lg bg-white/10 px-2.5 py-1 text-xs text-white/50 hover:bg-white/20 hover:text-white"
        >
          ⛶ Skrin Penuh
        </button>
      )}

      {/* Nama surau kecil (kiri atas) — hanya bila BUKAN poster isi penuh, supaya poster bersih */}
      {!(mode === "normal" && sceneKini === "poster" && posterIsi === "penuh") && (
        <div className="px-6 pt-3 text-lg font-bold text-amber-300 sm:text-2xl">{namaSurau}</div>
      )}

      {/* ====== IQAMAH / SOLAT OVERLAY ====== */}
      {mode !== "normal" && (() => {
        const jam = String(Math.floor(iqamahBaki / 60)).padStart(2, "0");
        const saat = String(iqamahBaki % 60).padStart(2, "0");
        const cd = `${jam}:${saat}`;
        return (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            {/* ---- IQAMAH ---- */}
            {mode === "iqamah" && iqamahGaya === "besar" && (
              <>
                <div className="text-2xl font-semibold text-amber-200 sm:text-4xl">Menunggu Iqamah · {waktuAzan}</div>
                <div className="font-mono text-[26vw] font-extrabold leading-none lg:text-[20vw]">{cd}</div>
                <div className="text-xl text-white/70 sm:text-3xl">Sila bersedia &amp; rapatkan saf</div>
              </>
            )}
            {mode === "iqamah" && iqamahGaya === "kaligrafi" && (
              <>
                <div className="leading-none text-amber-300 text-[16vw] lg:text-[12vw]" style={{ fontFamily: "'Traditional Arabic','Amiri','Scheherazade New',serif" }}>إقامة</div>
                <div className="mt-2 text-2xl font-semibold text-white/90 sm:text-4xl">Menunggu Iqamah — {waktuAzan}</div>
                <div className="mt-2 font-mono text-6xl font-extrabold sm:text-8xl">{cd}</div>
                <div className="mt-3 text-lg text-white/60 sm:text-2xl">Luruskan &amp; rapatkan saf</div>
              </>
            )}
            {mode === "iqamah" && iqamahGaya !== "besar" && iqamahGaya !== "kaligrafi" && (
              <>
                <div className="text-4xl font-extrabold tracking-widest text-amber-300 sm:text-6xl">أذان</div>
                <div className="mt-2 text-2xl font-bold sm:text-4xl">Telah masuk waktu {waktuAzan}</div>
                <div className="mt-6 text-xl font-semibold text-amber-200 sm:text-2xl">Menunggu Iqamah</div>
                <div className="mt-1 font-mono text-7xl font-extrabold sm:text-9xl">{cd}</div>
                <div className="mt-4 text-xl text-white/70">Sila bersedia &amp; rapatkan saf</div>
              </>
            )}

            {/* ---- SOLAT ---- */}
            {mode === "solat" && iqamahGaya === "besar" && (
              <>
                <div className="font-extrabold leading-none text-[24vw] lg:text-[18vw]">SOLAT</div>
                <div className="text-2xl text-amber-200 sm:text-4xl">Luruskan &amp; Rapatkan Saf</div>
              </>
            )}
            {mode === "solat" && iqamahGaya === "kaligrafi" && (
              <>
                <div className="leading-none text-amber-300 text-[20vw] lg:text-[15vw]" style={{ fontFamily: "'Traditional Arabic','Amiri','Scheherazade New',serif" }}>صلاة</div>
                <div className="mt-2 text-3xl font-bold text-white/90 sm:text-5xl">Luruskan &amp; Rapatkan Saf</div>
              </>
            )}
            {mode === "solat" && iqamahGaya !== "besar" && iqamahGaya !== "kaligrafi" && (
              <>
                <div className="text-5xl font-extrabold tracking-widest text-amber-300 sm:text-7xl">صلاة</div>
                <div className="mt-4 text-4xl font-bold sm:text-6xl">SOLAT</div>
                <div className="mt-3 text-2xl text-white/80">Luruskan &amp; Rapatkan Saf</div>
              </>
            )}
          </div>
        );
      })()}

      {/* ====== NORMAL · POSTER ISI PENUH (isi ruang atas bar, tak bertindih) ====== */}
      {mode === "normal" && sceneKini === "poster" && posters.length > 0 && posterIsi === "penuh" && (
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
          {/* Latar kabur — isi ruang kosong bila poster bukan 16:9 (elak jalur hitam) */}
          {!isVideoUrl(posters[posterIdx % posters.length]) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img aria-hidden src={posters[posterIdx % posters.length]} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
          )}
          {isVideoUrl(posters[posterIdx % posters.length]) ? (
            <video key={posters[posterIdx % posters.length]} src={posters[posterIdx % posters.length]} autoPlay muted loop playsInline className="relative h-full w-full object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={posters[posterIdx % posters.length]} alt={`Poster ${posterIdx + 1}`} className="relative h-full w-full object-contain" />
          )}
        </div>
      )}

      {/* ====== NORMAL ====== */}
      {mode === "normal" && !(sceneKini === "poster" && posterIsi === "penuh") && (
        <div className="flex flex-1 flex-col justify-center px-8">
          {sceneKini === "jam" && (
            <div className="text-center">
              <div className="font-mono text-[22vw] font-extrabold leading-none tracking-tight sm:text-[18vw] lg:text-[15vw]">
                {jam12}:{String(now.getMinutes()).padStart(2, "0")}<span className="text-[7vw] text-amber-300 lg:text-[4.5vw]">:{saatStr} {ampm}</span>
              </div>
              {waktuSeterusnya && (
                <div className="mt-3">
                  <div className="text-xl text-white/70 sm:text-2xl">
                    Menuju waktu <span className="font-semibold text-amber-200">{waktuSeterusnya.nama}</span> · {to12(waktuSeterusnya.masa)}
                  </div>
                  <div className="mt-1 font-mono text-4xl font-extrabold text-amber-300 sm:text-6xl">{kiraMasukWaktu}</div>
                </div>
              )}
            </div>
          )}

          {sceneKini === "poster" && posters.length > 0 && posterIsi !== "penuh" && (
            <div className="flex flex-col items-center justify-center">
              {isVideoUrl(posters[posterIdx % posters.length]) ? (
                <video key={posters[posterIdx % posters.length]} src={posters[posterIdx % posters.length]} autoPlay muted loop playsInline className="max-h-[74vh] w-auto max-w-[94vw] rounded-2xl border border-white/10 object-contain shadow-2xl" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={posters[posterIdx % posters.length]} alt={`Poster ${posterIdx + 1}`} className="max-h-[74vh] w-auto max-w-[94vw] rounded-2xl border border-white/10 object-contain shadow-2xl" />
              )}
            </div>
          )}
        </div>
      )}

      {/* ====== JALUR BAWAH: JAM + TARIKH + WAKTU SOLAT (+ Imsak) ====== */}
      {waktu.length > 0 && (
        <div className="flex items-stretch gap-1 bg-black/55 p-1.5">
          {/* Jam besar + tarikh */}
          <div className="flex flex-[2.2] flex-col items-center justify-center rounded-lg bg-amber-400/15 px-2 py-1">
            <div className="font-mono text-2xl font-extrabold leading-none text-amber-200 sm:text-4xl">
              {jamPapar}<span className="ml-1 text-base sm:text-2xl">{ampm}</span>
            </div>
            <div className="mt-1 whitespace-nowrap text-[10px] leading-tight text-white/80 sm:text-sm">{dTarikhPendek}</div>
            <div className="whitespace-nowrap text-[10px] font-semibold leading-tight text-amber-200/90 sm:text-sm">{dHijri}</div>
          </div>
          {/* Waktu solat + Imsak */}
          {barWaktu.map((w) => {
            const aktif = !w.imsak && waktuSeterusnya?.nama === w.nama;
            return (
              <div key={w.nama} className={`flex flex-1 flex-col items-center justify-center rounded-lg px-1 py-1 ${aktif ? "bg-amber-400 text-slate-900" : "bg-white/10 text-white/90"}`}>
                <div className={`text-[10px] font-bold uppercase leading-none sm:text-sm ${aktif ? "text-amber-900" : "text-white/70"}`}>{w.nama}</div>
                <div className="mt-0.5 text-lg font-extrabold leading-none sm:text-2xl">{to12(w.masa)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ====== SCROLLER ====== */}
      <div className="overflow-hidden bg-black/70 py-2">
        <div className="paparan-marquee whitespace-nowrap text-lg font-semibold text-amber-100 sm:text-2xl">{scrollerText}</div>
      </div>

      <style>{`
        .paparan-marquee { display:inline-block; padding-left:100%; animation: paparanScroll 40s linear infinite; }
        @keyframes paparanScroll { from { transform: translateX(0);} to { transform: translateX(-100%);} }
      `}</style>
    </div>
  );
}
