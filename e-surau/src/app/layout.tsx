import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { NAMA_SURAU, LOGO_JAIS, LOGO_SELANGOR, LOGO_SURAU, NO_PENDAFTARAN } from "@/lib/tetapan";
import { khairatDibuka, penajaDipapar, infaqDipapar } from "@/lib/tetapanSistem";
import { getProfil, isMaster } from "@/lib/sesi";
import PenajaStrip from "@/components/PenajaStrip";
import NavUtama from "@/components/NavUtama";
import ChatbotWidget from "@/components/ChatbotWidget";
import { bahasaSemasa } from "@/lib/bahasa";
import { buatT } from "@/lib/i18n";

const namaSurau = NAMA_SURAU;

export const metadata: Metadata = {
  title: `${namaSurau} · Sistem Pengurusan Surau`,
  description: "Pendaftaran ahli kariah, khairat kematian & pengurusan surau.",
  // Ikon tab browser / homescreen — guna logo surau (bukan template asal).
  icons: {
    icon: [
      { url: "/logo-surau-1.png", type: "image/png" },
      { url: "/logo-surau-1.png", sizes: "32x32", type: "image/png" },
      { url: "/logo-surau-1.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/logo-surau-1.png",
    apple: "/logo-surau-1.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [khDibuka, penajaOn, infaqOn, profil] = await Promise.all([khairatDibuka(), penajaDipapar(), infaqDipapar(), getProfil()]);
  const master = isMaster(profil); // hanya super admin boleh pratonton
  const paparInfaq = infaqOn || master; // master boleh pratonton walau belum dilancarkan
  const stafPreview = !khDibuka && master; // super admin pratonton khairat walau belum dilancarkan
  const paparKhairat = khDibuka || stafPreview;
  const penajaPreview = !penajaOn && master; // super admin pratonton iklan
  const paparPenaja = penajaOn || penajaPreview;
  const lang = bahasaSemasa();
  const t = buatT(lang);
  return (
    <html lang={lang}>
      <body>
        <div className="print-hide border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_SURAU} alt={namaSurau} className="h-12 w-auto sm:h-16" />
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_SELANGOR} alt="Jata Negeri Selangor" className="h-8 w-auto" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_JAIS} alt="Logo JAIS" className="h-8 w-auto" />
            </div>
          </div>
        </div>
        <header className="print-hide relative bg-hitam text-white shadow">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-sm font-bold text-surau-light">
              {t("Portal Kariah", "Community Portal")}
            </Link>
            <NavUtama
              lang={lang}
              paparKhairat={paparKhairat}
              stafPreview={stafPreview}
              paparInfaq={paparInfaq}
              infaqOn={infaqOn}
              master={master}
            />
          </div>
        </header>
        {paparPenaja && (
          <div className="print-hide mx-auto max-w-5xl px-4 pt-6">
            <PenajaStrip pratonton={penajaPreview} />
          </div>
        )}
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="print-hide mt-16 border-t bg-white py-6 text-center text-xs text-slate-500">
          <div className="mb-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {paparInfaq && <Link href="/infaq" className="font-medium text-surau hover:underline">{t("Infaq", "Infaq")}{!infaqOn && master ? " ·pratonton" : ""}</Link>}
            {paparPenaja && <Link href="/rakan" className="font-medium text-surau hover:underline">{t("Rakan Surau", "Our Partners")}</Link>}
            <Link href="/tender" className="font-medium text-surau hover:underline">{t("Tender & Iklan", "Tenders")}</Link>
            <Link href="/kewangan" className="font-medium text-surau hover:underline">{t("Kewangan", "Finances")}</Link>
            <Link href="/dasar-privasi" className="font-medium text-surau hover:underline">{t("Dasar Privasi", "Privacy Policy")}</Link>
            <Link href="/terma" className="font-medium text-surau hover:underline">{t("Terma & Penafian", "Terms & Disclaimer")}</Link>
            <Link href="/maklum-balas" className="font-medium text-surau hover:underline">{t("Maklum Balas", "Feedback")}</Link>
            <Link href="/keselamatan" className="font-medium text-surau hover:underline">{t("Keselamatan", "Security")}</Link>
            <Link href="/polisi-bayaran-balik" className="font-medium text-surau hover:underline">{t("Bayaran Balik", "Refunds")}</Link>
          </div>
          <div>{t("Jawatankuasa Surau Ar Raudhah, Eco Majestic", "Surau Ar Raudhah Committee, Eco Majestic")}</div>
          <div className="mt-1 text-slate-400">No. Pendaftaran JAIS: {NO_PENDAFTARAN}</div>
        </footer>
        {/* Pembantu Maya AI — ahli berdaftar (log masuk) sahaja */}
        {profil && <ChatbotWidget lang={lang} nama={profil.nama ?? ""} />}
      </body>
    </html>
  );
}
