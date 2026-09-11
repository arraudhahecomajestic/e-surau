"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buatT, bahasaCookieKlien, type Bahasa } from "@/lib/i18n";
import { pautkanPembekal } from "@/app/pembekal/portal/actions";
import { pautkanAhli } from "@/app/daftar/actions";

async function destIkutPeranan(supabase: any): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "";
  const { data: prof } = await supabase.from("profil").select("peranan, pembekal_id, ahli_id").eq("id", user.id).single();
  if (prof?.peranan === "kerani") return "/kerani";
  if (prof?.peranan === "bendahari") return "/admin/kewangan";
  if (prof?.peranan === "imam") return "/admin/tahlil";
  if (prof?.peranan === "juruaudit") return "/admin/agm";
  if (prof?.peranan === "admin") return "/admin";
  if (prof?.peranan === "ajk") return "/admin/program";
  // Auto-sambung ikut e-mel jika belum dipautkan (boleh jadi ahli & pembekal serentak).
  const aid = prof?.ahli_id ?? (await pautkanAhli());
  const pid = prof?.pembekal_id ?? (await pautkanPembekal());
  if (aid) return "/ahli";           // ahli kariah → portal ahli (boleh ke portal pembekal dari sana)
  if (pid) return "/pembekal/portal";
  return "/ahli";
}

export default function MasukPage() {
  const router = useRouter();
  const [emel, setEmel] = useState("");
  const [kataLaluan, setKataLaluan] = useState("");
  const [ralat, setRalat] = useState("");
  const [sedang, setSedang] = useState(false);
  const [semakSesi, setSemakSesi] = useState(true);
  const [lang, setLang] = useState<Bahasa>("ms");
  useEffect(() => { setLang(bahasaCookieKlien()); }, []);
  const tr = buatT(lang);

  // Jika sudah log masuk, terus hantar ke ruang mengikut peranan.
  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const supabase = createClient();
        const dest = await destIkutPeranan(supabase);
        if (batal) return;
        if (dest) { router.replace(dest); router.refresh(); return; }
      } catch { /* abaikan — tunjuk borang login */ }
      if (!batal) setSemakSesi(false);
    })();
    // Fallback: jangan sekali-kali tersangkut lebih 4 saat
    const t = setTimeout(() => { if (!batal) setSemakSesi(false); }, 4000);
    return () => { batal = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function masuk(e: React.FormEvent) {
    e.preventDefault();
    setRalat("");
    setSedang(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: emel,
      password: kataLaluan,
    });
    if (error) {
      setSedang(false);
      setRalat(tr("Emel atau kata laluan salah.", "Incorrect email or password."));
      return;
    }
    // Redirect ikut peranan: staf → /admin, ahli → /ahli
    const dest = (await destIkutPeranan(supabase)) || "/ahli";
    setSedang(false);
    router.push(dest);
    router.refresh();
  }

  if (semakSesi) {
    return <div className="mx-auto max-w-sm py-16 text-center text-sm text-slate-400">{tr("Menyemak sesi…", "Checking session…")}</div>;
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">{tr("Log Masuk", "Login")}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {tr("Untuk ahli kariah, AJK, bendahari & admin surau.", "For community members, committee, treasurer & surau admins.")}
        </p>
        <div className="mt-3 rounded-lg border border-surau/30 bg-surau/5 p-3 text-xs text-slate-600">
          {tr(
            "Ahli sedia ada: guna emel anda, kata laluan = No. Kad Pengenalan anda (tanpa sengkang). Sila tukar kata laluan selepas log masuk.",
            "Existing members: use your email, password = your IC number (without dashes). Please change your password after logging in.",
          )}
        </div>

        <form onSubmit={masuk} className="mt-4 space-y-3">
          {ralat && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {ralat}
            </div>
          )}
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{tr("Emel", "Email")}</span>
            <input
              type="email"
              required
              value={emel}
              onChange={(e) => setEmel(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-surau"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{tr("Kata Laluan", "Password")}</span>
            <input
              type="password"
              required
              value={kataLaluan}
              onChange={(e) => setKataLaluan(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-surau"
            />
          </label>
          <button
            disabled={sedang}
            className="w-full rounded-lg bg-surau px-4 py-2 font-semibold text-white hover:bg-surau-dark disabled:opacity-60"
          >
            {sedang ? tr("Sedang masuk…", "Logging in…") : tr("Log Masuk", "Login")}
          </button>
        </form>
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">
        <Link href="/lupa-kata-laluan" className="font-medium text-surau hover:underline">{tr("Lupa kata laluan?", "Forgot password?")}</Link>
      </p>
      <p className="mt-2 text-center text-sm text-slate-500">
        {tr("Belum ada akaun / ahli baharu?", "No account yet / new member?")}{" "}
        <Link href="/daftar" className="font-medium text-surau hover:underline">{tr("Daftar di sini", "Register here")}</Link>
      </p>
      <p className="mt-1 text-center text-sm text-slate-500">
        {tr("Vendor / Imam / Bilal / Pembekal?", "Vendor / Imam / Bilal / Supplier?")}{" "}
        <Link href="/pembekal/daftar" className="font-medium text-surau hover:underline">{tr("Daftar Pembekal", "Register as Supplier")}</Link>
      </p>
      <p className="mt-2 text-center text-sm text-slate-500">
        <Link href="/" className="hover:underline">{tr("← Kembali ke laman utama", "← Back to home")}</Link>
      </p>
    </div>
  );
}
