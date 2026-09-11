"use client";
import Link from "next/link";
import { useState } from "react";

type Item = { href: string; label: string };
type Kump = { label: string; items: Item[] };

// Kumpulan untuk admin/AJK/master
const KEAHLIAN: Item[] = [
  { href: "/admin/kariah-kawasan", label: "Kawasan / Fasa" },
  { href: "/admin/cetak", label: "Cetak Borang" },
];
const KEWANGAN: Item[] = [
  { href: "/admin/kewangan", label: "Kewangan" },
  { href: "/admin/khairat", label: "Khairat" },
  { href: "/admin/tuntutan", label: "Tuntutan" },
];
const AKTIVITI: Item[] = [
  { href: "/admin/program", label: "Program" },
  { href: "/admin/paparan", label: "Paparan TV" },
  { href: "/admin/tahlil", label: "Tahlil" },
  { href: "/admin/sewaan", label: "Sewaan" },
  { href: "/admin/aset", label: "Aset" },
  { href: "/admin/vendor", label: "Vendor" },
];
const SETIAUSAHA: Item[] = [
  { href: "/admin/su", label: "Panel Setiausaha" },
  { href: "/admin/agm", label: "Mesyuarat Agung (AGM)" },
  { href: "/admin/su/mesyuarat", label: "Minit Mesyuarat" },
  { href: "/admin/su/surat", label: "Surat Rasmi" },
  { href: "/admin/tender", label: "Tender & Iklan" },
  { href: "/admin/pengumuman", label: "Pengumuman" },
  { href: "/admin/maklum-balas", label: "Maklum Balas" },
  { href: "/admin/kandungan", label: "Kandungan Surau" },
];
const SISTEM: Item[] = [
  { href: "/admin/penaja", label: "Penaja" },
  { href: "/admin/peranan", label: "Peranan" },
  { href: "/admin/tetapan", label: "Tetapan" },
];

export default function AdminNav({ aktif, nama, peranan, master }: { aktif: string; nama?: string; peranan?: string; master?: boolean }) {
  let atas: Item[] = [];
  let kumpulan: Kump[] = [];

  if (peranan === "bendahari" || peranan === "imam") {
    // Peranan terhad — kekal ringkas (flat)
    atas = peranan === "bendahari"
      ? [{ href: "/admin/kewangan", label: "Kewangan" }, { href: "/admin/tuntutan", label: "Tuntutan" }, { href: "/admin/agm", label: "Mesyuarat Agung (AGM)" }, { href: "/admin/staf/penilaian", label: "Penilaian Staf" }]
      : [{ href: "/admin/tahlil", label: "Tahlil" }];
  } else if (peranan === "ajk" && !master) {
    // AJK (bukan master) — akses terhad
    kumpulan = [
      { label: "Aktiviti", items: [
        { href: "/admin/program", label: "Program" },
        { href: "/admin/paparan", label: "Paparan TV" },
        { href: "/admin/tahlil", label: "Tahlil" },
        { href: "/admin/vendor", label: "Vendor" },
      ] },
      { label: "Khairat & Tuntutan", items: [
        { href: "/admin/khairat", label: "Khairat" },
        { href: "/admin/tuntutan", label: "Tuntutan (sah)" },
      ] },
      { label: "Kandungan", items: [
        { href: "/admin/agm", label: "Mesyuarat Agung (AGM)" },
        { href: "/admin/pengumuman", label: "Pengumuman" },
        { href: "/admin/maklum-balas", label: "Maklum Balas" },
        { href: "/admin/kandungan", label: "Kandungan Surau" },
      ] },
      { label: "Keahlian", items: [
        { href: "/admin/kariah-kawasan", label: "Kawasan / Fasa" },
      ] },
      { label: "Staf", items: [
        { href: "/admin/staf/penilaian", label: "Penilaian Prestasi" },
      ] },
    ];
  } else {
    // Admin / Master — penuh. Staf & Gaji hanya untuk SU (master).
    atas = [{ href: "/admin", label: "Permohonan" }];
    if (master) atas.push({ href: "/admin/staf", label: "Staf" });
    kumpulan = [
      { label: "Keahlian", items: KEAHLIAN },
      { label: "Kewangan", items: KEWANGAN },
      { label: "Aktiviti", items: AKTIVITI },
      { label: "Setiausaha", items: SETIAUSAHA },
    ];
    if (master) kumpulan.push({ label: "Sistem", items: SISTEM });
  }

  return <Sidebar aktif={aktif} nama={nama} atas={atas} kumpulan={kumpulan} />;
}

function Sidebar({ aktif, nama, atas, kumpulan }: { aktif: string; nama?: string; atas: Item[]; kumpulan: Kump[] }) {
  const [buka, setBuka] = useState(false);
  const tutup = () => setBuka(false);

  const pautanCls = (href: string) =>
    `block rounded-lg px-3 py-2 text-sm ${aktif === href ? "bg-surau font-semibold text-white" : "text-slate-600 hover:bg-slate-100"}`;

  return (
    <>
      {/* Anjak kandungan ke kanan di desktop supaya sidebar tetap ada ruang */}
      <style jsx global>{`
        @media (min-width: 1024px) {
          body { padding-left: 14rem; }
        }
      `}</style>

      {/* Bar atas (mobile sahaja) */}
      <div className="mb-5 flex items-center justify-between border-b pb-3 lg:hidden">
        <button onClick={() => setBuka(true)} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700">
          <span className="text-lg leading-none">☰</span> Menu
        </button>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          {nama && <span className="hidden sm:inline">{nama}</span>}
          <form action="/masuk/logout" method="post"><button className="hover:underline">Log keluar</button></form>
        </div>
      </div>

      {/* Backdrop bila drawer buka (mobile) */}
      {buka && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={tutup} />}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 z-50 flex h-screen w-56 flex-col overflow-y-auto border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${buka ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between border-b px-4 py-4">
          <Link href="/admin" onClick={tutup} className="block">
            <div className="text-sm font-bold text-surau">Panel Pentadbir</div>
            <div className="mt-0.5 text-xs text-slate-400">Surau Ar-Raudhah</div>
          </Link>
          <button onClick={tutup} className="text-slate-400 hover:text-slate-700 lg:hidden" aria-label="Tutup">✕</button>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-3">
          {atas.map((it) => (
            <Link key={it.href} href={it.href} onClick={tutup} className={pautanCls(it.href)}>{it.label}</Link>
          ))}
          {kumpulan.map((k) => (
            <KumpulanNav key={k.label} kump={k} aktif={aktif} onNav={tutup} />
          ))}
        </nav>

        <div className="space-y-1 border-t px-2 py-3">
          <Link href="/admin/tuntutan-saya" onClick={tutup} className="block rounded-lg px-3 py-2 text-sm font-medium text-surau hover:bg-surau/10">Tuntutan Saya</Link>
          <Link href="/ahli" onClick={tutup} className="block rounded-lg px-3 py-2 text-sm font-medium text-surau hover:bg-surau/10">Portal Saya</Link>
          {nama && <div className="px-3 pt-1 text-xs text-slate-400">{nama}</div>}
          <form action="/masuk/logout" method="post"><button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100">Log keluar</button></form>
        </div>
      </aside>
    </>
  );
}

// Kumpulan boleh buka/tutup (dropdown). Auto-buka jika kumpulan mengandungi halaman aktif.
function KumpulanNav({ kump, aktif, onNav }: { kump: Kump; aktif: string; onNav: () => void }) {
  const adaAktif = kump.items.some((i) => aktif === i.href || aktif.startsWith(i.href + "/"));
  const [buka, setBuka] = useState(adaAktif);
  return (
    <div className="pt-1">
      <button
        onClick={() => setBuka((v) => !v)}
        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${adaAktif ? "text-surau" : "text-slate-700"} hover:bg-slate-100`}
      >
        <span>{kump.label}</span>
        <span className={`text-[10px] transition-transform ${buka ? "rotate-180" : ""}`}>▾</span>
      </button>
      {buka && (
        <div className="mt-0.5 space-y-0.5 border-l border-slate-100 pl-2">
          {kump.items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={onNav}
              className={`block rounded-lg px-3 py-2 text-sm ${aktif === it.href ? "bg-surau font-semibold text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {it.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
