import Link from "next/link";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { rm } from "@/lib/format";
import { JENIS_BANTUAN, labelJenis, emojiJenis } from "@/lib/bantuan";
import { NAMA_SURAU } from "@/lib/tetapan";

export const dynamic = "force-dynamic";

export default async function BantuanAwamPage() {
  let baki = 0, masuk = 0, keluar = 0, kesDibantu = 0;
  const ikutJenis: Record<string, { bil: number; jumlah: number }> = {};

  if (adminConfigured) {
    const db = createAdminClient();
    const [tbRes, pmRes] = await Promise.all([
      db.from("bantuan_tabung").select("arah, jumlah"),
      db.from("bantuan_permohonan").select("jenis, jumlah_lulus, status").in("status", ["bayar", "selesai"]),
    ]);
    const tabung = (tbRes.data as any[]) ?? [];
    masuk = tabung.filter((t) => t.arah === "masuk").reduce((s, t) => s + Number(t.jumlah || 0), 0);
    keluar = tabung.filter((t) => t.arah === "keluar").reduce((s, t) => s + Number(t.jumlah || 0), 0);
    baki = masuk - keluar;

    const dibayar = (pmRes.data as any[]) ?? [];
    kesDibantu = dibayar.length;
    for (const b of dibayar) {
      const k = b.jenis || "lain";
      (ikutJenis[k] ||= { bil: 0, jumlah: 0 });
      ikutJenis[k].bil += 1;
      ikutJenis[k].jumlah += Number(b.jumlah_lulus || 0);
    }
  }

  const senaraiJenis = JENIS_BANTUAN
    .map((j) => ({ ...j, ...(ikutJenis[j.kod] ?? { bil: 0, jumlah: 0 }) }))
    .filter((j) => j.bil > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Tabung Ihsan · Bantuan Kecemasan</h1>
        <p className="mt-1 text-sm text-slate-600">{NAMA_SURAU}</p>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600">
          Tabung ihsan membantu ahli kariah yang memerlukan — wang tunai, minyak, sewa, makanan, perubatan & bil.
          Demi menjaga maruah penerima, kami kongsi angka keseluruhan sahaja tanpa mendedahkan sebarang nama.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kad label="Baki Tabung" nilai={rm(baki)} warna="text-surau" />
        <Kad label="Jumlah Disalurkan" nilai={rm(keluar)} warna="text-green-600" />
        <Kad label="Keluarga Dibantu" nilai={`${kesDibantu}`} warna="text-slate-800" />
      </div>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Bantuan Mengikut Kategori</h2>
        {senaraiJenis.length === 0 ? (
          <p className="text-sm text-slate-400">Belum ada bantuan direkodkan lagi.</p>
        ) : (
          <div className="space-y-2">
            {senaraiJenis.map((j) => (
              <div key={j.kod} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
                <span className="text-sm text-slate-700">{emojiJenis(j.kod)} {labelJenis(j.kod)}</span>
                <span className="text-sm text-slate-600">{j.bil} kes · <b className="text-slate-800">{rm(j.jumlah)}</b></span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="rounded-xl border border-surau/20 bg-surau/5 p-5 text-center">
        <h2 className="font-semibold text-slate-900">Ingin menyumbang?</h2>
        <p className="mt-1 text-sm text-slate-600">Sumbangan anda ke Tabung Ihsan membantu jiran kariah yang memerlukan. Hubungi pejabat surau atau salurkan melalui tabung surau.</p>
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          <Link href="/infaq" className="rounded-lg bg-surau px-5 py-2.5 text-sm font-semibold text-white hover:bg-surau-dark">Infaq / Sumbangan</Link>
          <Link href="/ahli/bantuan" className="rounded-lg border border-surau/40 px-5 py-2.5 text-sm font-semibold text-surau hover:bg-surau/10">Mohon Bantuan (Ahli)</Link>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        Permohonan bantuan hanya untuk ahli kariah berdaftar. Setiap kes disemak oleh Biro Kebajikan surau.
      </p>
    </div>
  );
}

function Kad({ label, nilai, warna }: { label: string; nilai: string; warna: string }) {
  return (
    <div className="rounded-xl bg-white p-5 text-center shadow-sm">
      <div className={`text-2xl font-bold ${warna}`}>{nilai}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}
