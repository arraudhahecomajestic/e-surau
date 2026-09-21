"use client";

import Link from "next/link";
import { useState } from "react";
import ToggleBahasa from "@/components/ToggleBahasa";
import { buatT } from "@/lib/i18n";

type Props = {
  lang: string;
  paparKhairat: boolean;
  stafPreview: boolean;
  paparInfaq: boolean;
  infaqOn: boolean;
  master: boolean;
};

export default function NavUtama({ lang, paparKhairat, stafPreview, paparInfaq, infaqOn, master }: Props) {
  const t = buatT(lang as any);
  const [buka, setBuka] = useState(false);            // menu mobile
  const [menu, setMenu] = useState<null | "khidmat" | "tentang">(null); // dropdown desktop

  const infaqPratonton = !infaqOn && master;

  const perkhidmatan = [
    paparKhairat && { href: "/khairat", label: `${t("Khairat", "Death Benefit")}${stafPreview ? " ·pratonton" : ""}` },
    { href: "/bantuan", label: t("Bantuan / Tabung Ihsan", "Aid / Ihsan Fund") },
    paparInfaq && { href: "/infaq", label: `${t("Infaq", "Infaq")}${infaqPratonton ? " ·pratonton" : ""}` },
    { href: "/sewaan", label: t("Sewaan", "Rental") },
    { href: "/pembekal/daftar", label: t("Vendor", "Vendors") },
    { href: "/tender", label: t("Tender & Iklan", "Tenders") },
    { href: "/kewangan", label: t("Kewangan", "Finances") },
  ].filter(Boolean) as { href: string; label: string }[];

  const tentang = [
    { href: "/program", label: t("Program", "Programmes") },
    { href: "/tentang#carta", label: t("Carta & AJK", "Committee") },
    { href: "/tentang#visi", label: t("Visi & Misi", "Vision & Mission") },
    { href: "/tentang#buletin", label: t("Buletin", "Bulletin") },
  ];

  return (
    <div className="flex items-center gap-3">
      {/* ---- DESKTOP ---- */}
      <nav className="hidden items-center gap-x-4 text-sm sm:flex">
        <Link href="/" className="hover:underline">{t("Utama", "Home")}</Link>

        <Dropdown label={t("Perkhidmatan", "Services")} buka={menu === "khidmat"} onToggle={() => setMenu(menu === "khidmat" ? null : "khidmat")}>
          {perkhidmatan.map((p) => (
            <DropItem key={p.href} href={p.href} onClick={() => setMenu(null)}>{p.label}</DropItem>
          ))}
        </Dropdown>

        <Dropdown label={t("Tentang Surau", "About")} buka={menu === "tentang"} onToggle={() => setMenu(menu === "tentang" ? null : "tentang")}>
          {tentang.map((p) => (
            <DropItem key={p.href} href={p.href} onClick={() => setMenu(null)}>{p.label}</DropItem>
          ))}
        </Dropdown>

        <Link href="/daftar" className="rounded bg-surau px-3 py-1 font-semibold text-white hover:bg-surau-dark">
          {t("Daftar Ahli", "Register")}
        </Link>
        <Link href="/masuk" className="rounded border border-white/40 px-3 py-1 font-semibold text-white hover:bg-white/10">
          {t("Log Masuk", "Login")}
        </Link>
        <ToggleBahasa lang={lang as any} />
      </nav>

      {/* ---- MOBILE ---- */}
      <div className="flex items-center gap-2 sm:hidden">
        <Link href="/daftar" className="rounded bg-surau px-3 py-1 text-sm font-semibold text-white">
          {t("Daftar", "Register")}
        </Link>
        <button onClick={() => setBuka((v) => !v)} aria-label="Menu" className="rounded p-1.5 text-white hover:bg-white/10">
          <span className="text-xl leading-none">{buka ? "✕" : "☰"}</span>
        </button>
      </div>

      {buka && (
        <div className="absolute inset-x-0 top-full z-40 border-t border-white/10 bg-hitam px-4 py-3 text-sm shadow-lg sm:hidden">
          <MobLink href="/" onClick={() => setBuka(false)}>{t("Utama", "Home")}</MobLink>
          <div className="mt-2 border-t border-white/10 pt-2 text-xs uppercase tracking-wide text-surau-light">{t("Perkhidmatan", "Services")}</div>
          {perkhidmatan.map((p) => <MobLink key={p.href} href={p.href} onClick={() => setBuka(false)}>{p.label}</MobLink>)}
          <div className="mt-2 border-t border-white/10 pt-2 text-xs uppercase tracking-wide text-surau-light">{t("Tentang Surau", "About")}</div>
          {tentang.map((p) => <MobLink key={p.href} href={p.href} onClick={() => setBuka(false)}>{p.label}</MobLink>)}
          <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
            <Link href="/masuk" onClick={() => setBuka(false)} className="rounded border border-white/40 px-3 py-1.5 font-semibold text-white">{t("Log Masuk", "Login")}</Link>
            <ToggleBahasa lang={lang as any} />
          </div>
        </div>
      )}
    </div>
  );
}

function Dropdown({ label, buka, onToggle, children }: { label: string; buka: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <button onClick={onToggle} className="flex items-center gap-1 hover:underline">
        {label} <span className={`text-[10px] transition-transform ${buka ? "rotate-180" : ""}`}>▾</span>
      </button>
      {buka && (
        <div className="absolute left-0 top-full z-40 mt-2 min-w-[180px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

function DropItem({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="block px-4 py-2 text-slate-700 hover:bg-surau/10 hover:text-surau">
      {children}
    </Link>
  );
}

function MobLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="block py-2 text-white hover:text-surau-light">
      {children}
    </Link>
  );
}
