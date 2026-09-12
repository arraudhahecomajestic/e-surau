import Link from "next/link";
import { NAMA_SURAU, LOGO_SURAU_TEGAK } from "@/lib/tetapan";
import ButangCetakBorang from "@/components/ButangCetakBorang";

// Satu baris atur cara (masa + perkara + subteks pilihan).
export function BarisMasa({ masa, teks, sub }: { masa: string; teks: string; sub?: string }) {
  return (
    <div className="ac-row">
      <div className="ac-masa">{masa}</div>
      <div className="ac-teks">{teks}{sub ? <span className="ac-sub">{sub}</span> : null}</div>
    </div>
  );
}

// Satu perkara agenda (nombor + perkara + subteks pilihan).
export function BarisAgenda({ no, teks, sub }: { no: number; teks: string; sub?: string }) {
  return (
    <div className="ac-row">
      <div className="ac-no">{no}.</div>
      <div className="ac-teks">{teks}{sub ? <span className="ac-sub">{sub}</span> : null}</div>
    </div>
  );
}

export default function TemplatAgm({
  tajuk, subtajuk, pill, children,
}: {
  tajuk: string; subtajuk?: string; pill?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/agm" className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">← Kembali ke AGM</Link>
        <ButangCetakBorang label="Cetak / Simpan PDF" />
      </div>

      <article className="ac-sheet mx-auto max-w-[820px] rounded-lg bg-white p-10 shadow-sm">
        <header className="ac-lh">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SURAU_TEGAK} alt="Surau Ar-Raudhah" className="ac-logo" />
          <div className="ac-nama">{NAMA_SURAU}</div>
        </header>

        <div className="ac-ttl">
          {tajuk}
          {subtajuk ? <div className="ac-subttl">{subtajuk}</div> : null}
          {pill ? <div className="ac-pill">{pill}</div> : null}
        </div>

        <div className="ac-body">{children}</div>
      </article>

      <style>{`
        .ac-sheet { color:#0f172a; }
        .ac-lh { display:flex; flex-direction:column; align-items:center; text-align:center; border-bottom:2px solid #B8860B; padding-bottom:14px; margin-bottom:18px; }
        .ac-logo { width:70px; height:70px; object-fit:contain; margin-bottom:8px; }
        .ac-nama { font-size:15px; font-weight:800; letter-spacing:.3px; color:#0f172a; }
        .ac-ttl { text-align:center; font-size:16px; font-weight:800; color:#8C6708; line-height:1.4; margin-bottom:20px; }
        .ac-subttl { font-size:13px; font-weight:700; color:#8C6708; margin-top:4px; }
        .ac-pill { display:inline-block; margin-top:8px; background:#B8860B; color:#fff; font-size:11px; font-weight:800; letter-spacing:.5px; padding:3px 12px; border-radius:999px; }
        .ac-body { max-width:640px; margin:0 auto; }
        .ac-row { display:flex; gap:14px; padding:10px 0; border-bottom:1px dashed #e5e7eb; font-size:14px; }
        .ac-masa { flex:0 0 96px; font-weight:800; color:#0f172a; }
        .ac-no   { flex:0 0 26px; font-weight:800; color:#8C6708; }
        .ac-teks { flex:1; color:#1f2937; line-height:1.5; }
        .ac-sub  { display:block; color:#64748b; font-size:12px; margin-top:2px; }
        @media print {
          .no-print { display:none !important; }
          body { background:#fff !important; }
          .ac-sheet { box-shadow:none !important; border:none !important; max-width:100% !important; padding:8px 12px !important; }
          @page { size:A4; margin:16mm; }
        }
      `}</style>
    </div>
  );
}
