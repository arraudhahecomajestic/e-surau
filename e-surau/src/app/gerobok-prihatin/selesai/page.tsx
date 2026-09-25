import Link from "next/link";

export const dynamic = "force-dynamic";

export default function GerobokSelesai({ searchParams }: { searchParams: { ref?: string; gagal?: string } }) {
  const gagal = searchParams.gagal === "1";
  return (
    <div className="mx-auto max-w-lg rounded-xl bg-white p-8 text-center shadow-sm">
      <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl ${gagal ? "bg-red-100" : "bg-green-100"}`}>
        {gagal ? "✕" : "✓"}
      </div>
      <h1 className="text-xl font-bold text-slate-900">{gagal ? "Pembayaran Tidak Berjaya" : "Jazakumullahu Khairan!"}</h1>
      <p className="mt-2 text-slate-600">
        {gagal
          ? "Maaf, sumbangan anda tidak berjaya atau dibatalkan. Anda boleh cuba semula."
          : "Sumbangan anda untuk Gerobok Prihatin telah diterima. Surau akan membelikan barang keperluan bagi mengisi gerobok. Semoga Allah membalas dengan kebaikan berlipat ganda."}
        {searchParams.ref ? <><br /><span className="text-xs text-slate-400">Rujukan: {searchParams.ref}</span></> : null}
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/gerobok-prihatin" className="rounded-lg bg-surau px-5 py-2.5 font-semibold text-white hover:bg-surau-dark">{gagal ? "Cuba Semula" : "Kembali ke Gerobok Prihatin"}</Link>
        <Link href="/" className="rounded-lg border border-surau/40 px-5 py-2.5 font-semibold text-surau hover:bg-surau/10">Kembali ke Utama</Link>
      </div>
    </div>
  );
}
