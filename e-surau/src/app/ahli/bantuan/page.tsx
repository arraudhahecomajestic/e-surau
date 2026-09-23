import Link from "next/link";
import { getProfil } from "@/lib/sesi";
import { PerluMasuk } from "@/components/PerluMasuk";
import { pautWaBiro } from "@/lib/bantuan";

export const dynamic = "force-dynamic";

export default async function AhliBantuanPage() {
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <div className="text-xs text-slate-500">Portal Ahli</div>
          <h1 className="text-2xl font-bold text-slate-900">Bantuan Kecemasan</h1>
        </div>
        <Link href="/ahli" className="text-sm text-surau hover:underline">← Portal Saya</Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h2 className="font-semibold text-slate-900">Perlukan Bantuan?</h2>
        <p className="mt-1 text-sm text-slate-600">Hubungi kami:</p>
        <a href={pautWaBiro()} target="_blank" rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90">
          Hubungi Kami (WhatsApp)
        </a>
      </div>

      <p className="text-center text-xs text-slate-400">
        Maklumat pemohon dirahsiakan &amp; diproses dengan penuh amanah demi menjaga maruah penerima.
      </p>
    </div>
  );
}
