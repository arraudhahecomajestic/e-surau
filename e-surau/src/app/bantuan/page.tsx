import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { rm } from "@/lib/format";
import { JENIS_BANTUAN, labelJenis } from "@/lib/bantuan";
import { NAMA_SURAU } from "@/lib/tetapan";
import TabungIhsanDermaForm from "@/components/TabungIhsanDermaForm";

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
          Tabung ihsan membantu ahli kariah yang memerlukan — wang tunai, perubatan, pendidikan, sewa & keperluan asas.
          Demi menjaga maruah penerima, kami kongsi angka keseluruhan sahaja tanpa mendedahkan sebarang nama.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kad label="Baki Tabung" nilai={rm(baki)} warna="text-surau" />
        <Kad label="Jumlah Disalurkan" nilai={rm(keluar)} warna="text-green-600" />
        <Kad label="Keluarga Dibantu" nilai={`${kesDibantu}`} warna="text-slate-800" />
      </div>

      {/* Sumbang ke Tabung Ihsan — terus via CHIP (kredit ke baki tabung) */}
      <div className="rounded-xl border-2 border-surau/30 bg-surau/5 p-5">
        <div className="text-center">
          <h2 className="font-semibold text-slate-900">Sumbang ke Tabung Ihsan</h2>
          <p className="mx-auto mt-1 max-w-lg text-sm text-slate-600">
            Sumbangan anda terus masuk ke Tabung Ihsan untuk membantu jiran kariah yang memerlukan.
            Setiap ringgit disalurkan dengan amanah &amp; telus.
          </p>
        </div>
        <div className="mt-4">
          <TabungIhsanDermaForm />
        </div>
      </div>

      {senaraiJenis.length > 0 && (
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-900">Bantuan Mengikut Kategori</h2>
          <div className="space-y-2">
            {senaraiJenis.map((j) => (
              <div key={j.kod} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
                <span className="text-sm text-slate-700">{labelJenis(j.kod)}</span>
                <span className="text-sm text-slate-600">{j.bil} kes · <b className="text-slate-800">{rm(j.jumlah)}</b></span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Apa itu Tabung Ihsan — penerangan */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Apa itu Tabung Ihsan?</h2>
        <div className="mt-2 space-y-2 text-sm text-slate-600">
          <p>
            Tabung Ihsan ialah dana kebajikan Surau Ar-Raudhah yang dikumpul daripada <b>sedekah, derma &amp; infaq</b>
            ahli kariah dan orang ramai — bukan dana zakat. Ia lahir daripada semangat <b>ihsan &amp; ta&rsquo;awun</b>
            (tolong-menolong) sesama jiran kariah: yang berkemampuan menghulur, yang memerlukan dibantu.
          </p>
          <p>
            Tujuannya membantu <b>ahli kariah yang benar-benar memerlukan</b> ketika kesempitan — meringankan beban
            sara hidup, perubatan, pendidikan, sewa tempat tinggal, modal kecil dan keperluan asas.
          </p>
          <p>
            Dana ini diuruskan dengan <b>amanah &amp; telus</b> oleh Biro Kebajikan surau. Setiap kes disemak dan
            diluluskan mengikut garis panduan, sambil menjaga <b>maruah penerima</b> — tiada nama didedahkan, hanya
            jumlah keseluruhan dilaporkan kepada ahli kariah. Setiap sumbangan anda menghidupkan tabung ini,
            insya-Allah menjadi amal jariah yang berterusan.
          </p>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        Setiap kes disemak &amp; diluluskan oleh Biro Kebajikan mengikut garis panduan. Maklumat pemohon dirahsiakan.
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
