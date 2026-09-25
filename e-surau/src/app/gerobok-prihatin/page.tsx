import { NAMA_SURAU } from "@/lib/tetapan";
import GerobokDermaForm from "@/components/GerobokDermaForm";

export const dynamic = "force-dynamic";

// Senarai barang keperluan semasa — kemas kini di sini bila perlu.
// status: "perlu" = stok kurang / sangat dialu-alukan; "cukup" = stok mencukupi.
const KEPERLUAN: { nama: string; status: "perlu" | "cukup" }[] = [
  { nama: "Beras", status: "perlu" },
  { nama: "Susu (tin / serbuk)", status: "perlu" },
  { nama: "Minyak masak", status: "perlu" },
  { nama: "Gula", status: "cukup" },
  { nama: "Tepung gandum", status: "cukup" },
  { nama: "Biskut", status: "cukup" },
];

const DIGALAKKAN = [
  "Beras", "Gula", "Tepung", "Minyak masak", "Susu tin & serbuk",
  "Biskut", "Kopi & teh", "Makanan dalam tin (sardin, baked beans)",
  "Mi segera / bihun", "Serbuk milo", "Barangan bayi (susu, lampin)", "Rempah asas",
];

export default function GerobokPrihatinPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* Hero */}
      <div className="rounded-2xl border border-surau/20 bg-surau/5 p-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Gerobok Prihatin</h1>
        <p className="mt-2 text-lg font-semibold text-surau">“Beri bila mampu, ambil bila perlu.”</p>
        <p className="mt-1 text-sm text-slate-600">{NAMA_SURAU}</p>
      </div>

      {/* Apa itu */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Apa itu Gerobok Prihatin?</h2>
        <div className="mt-2 space-y-2 text-sm text-slate-600">
          <p>
            Gerobok Prihatin ialah rak sumbangan barang keperluan asas yang diletakkan di surau — beras, biskut,
            susu, tepung dan seumpamanya. Sesiapa yang berkemampuan boleh <b>meletakkan</b> barang, dan sesiapa
            yang memerlukan boleh <b>mengambil</b> secara percuma.
          </p>
          <p>
            Semangatnya mudah: <b>beri bila mampu, ambil bila perlu</b> — tanpa borang, tanpa soal, tanpa segan.
            Ia lahir daripada roh <b>ihsan &amp; ta&rsquo;awun</b> sesama jiran kariah, saling membantu meringankan beban.
          </p>
        </div>
      </div>

      {/* Keperluan semasa */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Barang Diperlukan Sekarang</h2>
        <p className="mt-1 text-xs text-slate-500">Bantu isi gerobok mengikut keperluan semasa:</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {KEPERLUAN.map((k) => (
            <div key={k.nama} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <span className="text-sm text-slate-700">{k.nama}</span>
              {k.status === "perlu" ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Sangat diperlukan</span>
              ) : (
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">Stok cukup</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Barang digalakkan */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Barang Yang Digalakkan</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {DIGALAKKAN.map((b) => (
            <span key={b} className="rounded-full border border-surau/30 bg-surau/5 px-3 py-1 text-xs font-medium text-surau">{b}</span>
          ))}
        </div>
        <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          <b>Sila pastikan:</b> barang kering &amp; tahan lama, masih dalam pembungkusan asal, dan <b>belum tamat tempoh (belum luput)</b>.
          Elakkan barang basah, mudah rosak atau makanan yang telah dibuka.
        </div>
      </div>

      {/* Cara & lokasi */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-surau/20 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">Nak Memberi?</h3>
          <p className="mt-1 text-sm text-slate-600">
            Bawa barang keperluan dan <b>letakkan terus di Gerobok Prihatin</b> di surau. Tidak perlu daftar —
            sumbangan anda menjadi sedekah &amp; amal jariah, insya-Allah.
          </p>
        </div>
        <div className="rounded-xl border border-surau/20 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">Nak Mengambil?</h3>
          <p className="mt-1 text-sm text-slate-600">
            Jika anda memerlukan, <b>ambil ikut keperluan</b> dengan secukupnya supaya orang lain juga dapat berkongsi.
            Tiada borang, tiada soal — ambillah dengan tenang.
          </p>
        </div>
      </div>

      {/* Sumbang wang — surau belikan barang */}
      <div className="rounded-xl border-2 border-surau/30 bg-surau/5 p-5">
        <h2 className="font-semibold text-slate-900">Tak Sempat Beli Barang? Sumbang Wang</h2>
        <p className="mt-1 text-sm text-slate-600">
          Anda juga boleh menyumbang secara wang — surau akan <b>membelikan barang keperluan</b> untuk mengisi
          Gerobok Prihatin. Setiap sumbangan direkod dengan telus dalam kewangan surau.
        </p>
        <div className="mt-4">
          <GerobokDermaForm />
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 text-center shadow-sm">
        <h3 className="font-semibold text-slate-900">Lokasi</h3>
        <p className="mt-1 text-sm text-slate-600">Gerobok Prihatin terletak di kawasan {NAMA_SURAU}. Sila lihat papan tanda di ruang legar surau.</p>
      </div>

      <p className="text-center text-xs text-slate-400">
        Gerobok Prihatin diselia oleh Biro Kebajikan surau. Marilah kita sama-sama menghidupkan budaya memberi &amp; berkongsi.
      </p>
    </div>
  );
}
