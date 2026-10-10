"use client";

import { useEffect, useState } from "react";

// Kaunter jumlah keseluruhan pelawat portal.
// - Tambah 1 sekali sehari setiap pelawat (nyahduplikat guna localStorage).
// - Kemas kini "live" setiap 20 saat (poll GET).
export default function PelawatKaunter() {
  const [jumlah, setJumlah] = useState<number | null>(null);

  useEffect(() => {
    let hidup = true;
    const hariIni = new Date().toISOString().slice(0, 10);
    const kunci = "pelawat_dikira";
    let sudahKira = false;
    try { sudahKira = localStorage.getItem(kunci) === hariIni; } catch {}

    async function muat() {
      try {
        const res = await fetch("/api/pelawat", { method: sudahKira ? "GET" : "POST", cache: "no-store" });
        const d = await res.json();
        if (hidup && typeof d?.jumlah === "number") setJumlah(d.jumlah);
        if (!sudahKira) {
          try { localStorage.setItem(kunci, hariIni); } catch {}
          sudahKira = true;
        }
      } catch { /* abai */ }
    }

    muat();
    const t = setInterval(muat, 20000);
    return () => { hidup = false; clearInterval(t); };
  }, []);

  if (jumlah === null) return null;
  return (
    <div className="pt-4 text-center text-xs text-slate-400">
      Jumlah pelawat portal:{" "}
      <span className="font-semibold text-slate-600">{jumlah.toLocaleString("en-MY")}</span>
    </div>
  );
}
