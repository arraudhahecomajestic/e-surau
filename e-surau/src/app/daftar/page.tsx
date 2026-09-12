"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { NAMA_SURAU, GELARAN, YURAN_KHAIRAT_TAHUNAN } from "@/lib/tetapan";
import { layakKhairat, umurDari, tarikhLahirDariKp } from "@/lib/khairat";
import { noTelefon, dataURLtoBlob } from "@/lib/format";
import { KAWASAN_PILIHAN } from "@/lib/kawasan";
import SignaturePad from "@/components/SignaturePad";
import KameraKp from "@/components/KameraKp";
import { semakKpDaftar, sediaEmelAhli, sahkanRekodTelefon } from "./actions";

const namaSurau = NAMA_SURAU;
const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

type Tanggungan = {
  nama: string;
  no_kp: string;
  hubungan: string;
  tarikh_lahir: string;
  oku: boolean;
  masih_belajar: boolean;
  dilindungi_khairat: boolean;
};
const kosong = (): Tanggungan => ({
  nama: "", no_kp: "", hubungan: "anak", tarikh_lahir: "", oku: false, masih_belajar: false, dilindungi_khairat: true,
});

export default function DaftarPage() {
  // Gate: semak No. KP dahulu sebelum borang penuh dipaparkan
  const [peringkat, setPeringkat] = useState<"semak" | "sahkan" | "baru" | "akaun" | "sudah">("semak");
  const [disahkanRec, setDisahkanRec] = useState(false);
  const [emelRec, setEmelRec] = useState<string | null>(null);
  const [semakNoKp, setSemakNoKp] = useState("");
  const [semakSedang, setSemakSedang] = useState(false);
  const [semakRalat, setSemakRalat] = useState("");
  const [ahliNama, setAhliNama] = useState<string | null>(null);
  // Pengesahan identiti (4 digit telefon) untuk ahli sedia ada
  const [tel4, setTel4] = useState("");
  const [tel4Sedang, setTel4Sedang] = useState(false);
  const [tel4Ralat, setTel4Ralat] = useState("");

  // Bahagian A
  const [gelaran, setGelaran] = useState("");
  const [nama, setNama] = useState("");
  const [noKp, setNoKp] = useState("");
  const [alamatKp, setAlamatKp] = useState("");
  const [alamatSekarang, setAlamatSekarang] = useState("");
  const [alamatSama, setAlamatSama] = useState(false);
  const [kawasan, setKawasan] = useState("");
  const [telRumah, setTelRumah] = useState("");
  const [hp, setHp] = useState("");
  const [emel, setEmel] = useState("");
  const [statusKahwin, setStatusKahwin] = useState("bujang");
  const [tempohNilai, setTempohNilai] = useState("");
  const [tempohUnit, setTempohUnit] = useState("tahun");
  const [pengakuan, setPengakuan] = useState(false);
  const [setuju, setSetuju] = useState(false);

  // Salinan KP — snap kamera (depan & belakang)
  const [urlDepan, setUrlDepan] = useState("");
  const [urlBelakang, setUrlBelakang] = useState("");
  const [muatNaik, setMuatNaik] = useState<"" | "depan" | "belakang">("");

  // Pengesahan: e-tandatangan + swafoto
  const [urlSelfie, setUrlSelfie] = useState("");
  const [muatSelfie, setMuatSelfie] = useState(false);
  const [ttdBaru, setTtdBaru] = useState<string | null>(null);

  // Akaun portal ahli (pilihan)
  const [kataLaluan, setKataLaluan] = useState("");
  const [kataLaluan2, setKataLaluan2] = useState("");

  // Khairat + tanggungan
  const [sertaiKhairat, setSertaiKhairat] = useState(true);
  const [khDibuka, setKhDibuka] = useState(false);
  const [tanggungan, setTanggungan] = useState<Tanggungan[]>([]);

  // Baca toggle khairat (runtime) dari tetapan_sistem — dikawal admin.
  useEffect(() => {
    if (!configured) return;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("tetapan_sistem")
          .select("nilai")
          .eq("kunci", "khairat_dibuka")
          .maybeSingle();
        setKhDibuka((data as any)?.nilai === "true");
      } catch {
        /* abaikan */
      }
    })();
  }, []);

  const [hantar, setHantar] = useState(false);
  const [selesai, setSelesai] = useState<null | { ok: boolean; msg: string }>(null);

  function ubahT(i: number, k: keyof Tanggungan, v: any) {
    setTanggungan((t) => t.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  }

  // No. KP diubah → auto-kira tarikh lahir dari IC/MyKid.
  function ubahKpTgg(i: number, val: string) {
    setTanggungan((t) =>
      t.map((r, idx) =>
        idx === i ? { ...r, no_kp: val, tarikh_lahir: tarikhLahirDariKp(val) ?? r.tarikh_lahir } : r
      )
    );
  }

  async function naikKp(sisi: "depan" | "belakang", fail: Blob) {
    if (!configured) return;
    setMuatNaik(sisi);
    const supabase = createClient();
    const path = `${crypto.randomUUID()}-${sisi}.jpg`;
    const { error } = await supabase.storage.from("salinan-kp").upload(path, fail, { contentType: (fail as any).type || "image/jpeg" });
    setMuatNaik("");
    if (error) {
      setSelesai({ ok: false, msg: `Gagal muat naik gambar IC (${sisi}): ` + error.message });
      return;
    }
    if (sisi === "depan") setUrlDepan(`salinan-kp/${path}`);
    else setUrlBelakang(`salinan-kp/${path}`);
  }

  async function snapSelfie(e: React.ChangeEvent<HTMLInputElement>) {
    const fail = e.target.files?.[0];
    if (!fail || !configured) return;
    setMuatSelfie(true);
    const supabase = createClient();
    const ext = fail.name.split(".").pop() || "jpg";
    const path = `${crypto.randomUUID()}-selfie.${ext}`;
    const { error } = await supabase.storage.from("salinan-kp").upload(path, fail);
    setMuatSelfie(false);
    if (error) { setSelesai({ ok: false, msg: "Gagal muat naik swafoto: " + error.message }); return; }
    setUrlSelfie(`salinan-kp/${path}`);
  }

  async function uploadTtd(dataUrl: string): Promise<string> {
    const supabase = createClient();
    const blob = dataURLtoBlob(dataUrl);
    const path = `${crypto.randomUUID()}-ttd.png`;
    const { error } = await supabase.storage.from("salinan-kp").upload(path, blob, { contentType: "image/png" });
    if (error) throw new Error(error.message);
    return `salinan-kp/${path}`;
  }

  // Gate: semak No. KP
  async function semakKp(e: React.FormEvent) {
    e.preventDefault();
    setSemakRalat("");
    const kp = semakNoKp.replace(/\D/g, "");
    if (kp.length < 6) { setSemakRalat("Sila masukkan No. Kad Pengenalan yang sah."); return; }
    setSemakSedang(true);
    const res = await semakKpDaftar(kp);
    setSemakSedang(false);
    if (!res.ok) { setSemakRalat(res.msg ?? "Ralat semakan."); return; }
    if (res.wujud) {
      // Rekod dijumpai (cth ahli Google Form) — sahkan identiti dulu (4 digit telefon),
      // BUKAN terus kata "sudah berdaftar". Elak mesej bercanggah & buntu.
      setAhliNama(res.nama ?? null);
      setNoKp(kp);
      setEmelRec(res.emel ?? null);
      setDisahkanRec(!!res.disahkan);
      setTel4(""); setTel4Ralat("");
      setPeringkat("sahkan");
    } else {
      // Belum ada → borang penuh, isi dari awal (No. KP dibawa masuk)
      setNoKp(kp);
      setPeringkat("baru");
    }
  }

  // Sahkan identiti ahli sedia ada guna 4 digit akhir telefon
  async function sahkanTelefon(e: React.FormEvent) {
    e.preventDefault();
    setTel4Ralat("");
    const t4 = tel4.replace(/\D/g, "");
    if (t4.length !== 4) { setTel4Ralat("Masukkan tepat 4 digit akhir no. telefon."); return; }
    setTel4Sedang(true);
    const res = await sahkanRekodTelefon(noKp, t4);
    setTel4Sedang(false);
    if (!res.ok) { setTel4Ralat(res.msg ?? "Ralat pengesahan."); return; }
    setAhliNama(res.nama ?? ahliNama);
    setEmelRec(res.emel ?? null);
    setDisahkanRec(!!res.disahkan);
    setEmel(res.emel ?? "");
    // Identiti disahkan → kalau dah ada akaun, arah log masuk; jika tidak, cipta akaun.
    setPeringkat(res.ada_akaun ? "sudah" : "akaun");
  }

  // Ahli sedia ada: cipta akaun portal (emel + kata laluan) & paut ikut emel
  async function daftarAkaun(e: React.FormEvent) {
    e.preventDefault();
    setSelesai(null);
    if (!configured) { setSelesai({ ok: false, msg: "Sistem belum disambung ke pangkalan data." }); return; }
    const e2 = emel.trim();
    if (!e2 || !e2.includes("@")) { setSelesai({ ok: false, msg: "Sila isi e-mel yang sah." }); return; }
    const kp = noKp.replace(/\D/g, "");
    if (kp.length < 6) { setSelesai({ ok: false, msg: "No. KP tidak sah. Sila semak semula." }); return; }
    // Kata laluan dicipta sendiri oleh ahli (lebih selamat).
    if (kataLaluan.length < 6) { setSelesai({ ok: false, msg: "Sila cipta kata laluan (sekurang-kurangnya 6 aksara)." }); return; }
    if (kataLaluan !== kataLaluan2) { setSelesai({ ok: false, msg: "Kata laluan tidak sepadan." }); return; }
    setHantar(true);
    // 1) Tetapkan emel pada rekod ahli supaya trigger paut ikut emel
    const paut = await sediaEmelAhli(kp, e2);
    if (!paut.ok) { setHantar(false); setSelesai({ ok: false, msg: paut.msg ?? "Ralat." }); return; }
    // 2) Cipta akaun auth (kata laluan sendiri)
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: e2,
      password: kataLaluan,
      options: {
        data: { nama: ahliNama ?? undefined },
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/selamat-datang` : undefined,
      },
    });
    setHantar(false);
    if (error) {
      const dah = error.message?.toLowerCase().includes("already");
      setSelesai({
        ok: false,
        msg: dah
          ? "E-mel ini sudah mempunyai akaun. Sila log masuk guna e-mel ini, atau guna 'Lupa kata laluan' untuk set semula."
          : "Ralat cipta akaun: " + error.message,
      });
      return;
    }
    setSelesai({ ok: true, msg: "Akaun anda berjaya dicipta! Sila semak e-mel untuk pengesahan, kemudian log masuk & lengkapkan butiran anda (alamat, gambar IC, e-tandatangan) dalam Portal Ahli." });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSelesai(null);
    if (!configured) {
      setSelesai({ ok: false, msg: "Sistem belum disambung ke pangkalan data." });
      return;
    }
    if (!gelaran) { setSelesai({ ok: false, msg: "Sila pilih Gelaran." }); return; }
    if (!nama || !noKp || !hp) {
      setSelesai({ ok: false, msg: "Sila isi Nama, No. KP dan No. H/P." });
      return;
    }
    if (!emel) { setSelesai({ ok: false, msg: "Sila isi E-mel." }); return; }
    if (!urlDepan || !urlBelakang) { setSelesai({ ok: false, msg: "Sila snap gambar IC depan & belakang." }); return; }
    if (!alamatKp) { setSelesai({ ok: false, msg: "Sila isi Alamat dalam Kad Pengenalan." }); return; }
    if (!alamatSama && !alamatSekarang) { setSelesai({ ok: false, msg: "Sila isi Alamat tempat tinggal sekarang." }); return; }
    if (!tempohNilai) { setSelesai({ ok: false, msg: "Sila isi Tempoh masa menetap." }); return; }
    if (!pengakuan) {
      setSelesai({ ok: false, msg: "Sila tandakan pengakuan (Bahagian A, no. 8)." });
      return;
    }
    if (!setuju) {
      setSelesai({ ok: false, msg: "Sila bersetuju dengan Dasar Privasi & Terma Penggunaan." });
      return;
    }
    if (!ttdBaru) { setSelesai({ ok: false, msg: "Sila turunkan e-tandatangan." }); return; }
    if (!urlSelfie) { setSelesai({ ok: false, msg: "Sila ambil swafoto (selfie) untuk pengesahan." }); return; }
    // Akaun portal WAJIB untuk semua ahli baharu
    if (!emel || !emel.includes("@")) {
      setSelesai({ ok: false, msg: "Sila isi E-mel yang sah — akaun portal wajib untuk semua ahli." });
      return;
    }
    if (kataLaluan.length < 6) {
      setSelesai({ ok: false, msg: "Sila cipta kata laluan (sekurang-kurangnya 6 aksara)." });
      return;
    }
    if (kataLaluan !== kataLaluan2) {
      setSelesai({ ok: false, msg: "Kata laluan tidak sepadan." });
      return;
    }
    const nakAkaun = true;
    setHantar(true);
    const supabase = createClient();
    let urlTtd = "";
    try { urlTtd = await uploadTtd(ttdBaru); }
    catch (err: any) { setHantar(false); setSelesai({ ok: false, msg: "Gagal simpan tandatangan: " + err.message }); return; }
    const UP = (s: string) => (s || "").toUpperCase();
    const payload = {
      kariah: namaSurau,
      gelaran, nama: UP(nama), no_kp: noKp,
      alamat_kp: UP(alamatKp), alamat: UP(alamatSama ? alamatKp : alamatSekarang), kawasan,
      no_telefon_rumah: noTelefon(telRumah), telefon: noTelefon(hp), emel: emel.trim().toLowerCase(),
      status_perkahwinan: statusKahwin,
      tempoh_menetap_nilai: tempohNilai, tempoh_menetap_unit: tempohUnit,
      pengakuan, url_kp_depan: urlDepan, url_kp_belakang: urlBelakang,
      url_tandatangan: urlTtd, url_selfie: urlSelfie,
      sertai_khairat: khDibuka && sertaiKhairat,
      tanggungan: tanggungan
        .filter((t) => t.nama.trim() !== "")
        .map((t) => ({ ...t, nama: UP(t.nama), dilindungi_khairat: layakKhairat(t).layak })),
    };
    const { error } = await supabase.rpc("daftar_ahli", { payload });
    if (error) {
      setHantar(false);
      const dup = error.message?.includes("duplicate");
      setSelesai({ ok: false, msg: dup ? "No. KP ini sudah didaftarkan." : "Ralat: " + error.message });
      return;
    }

    // Cipta akaun portal ahli (jika kata laluan diisi). Rekod ahli dicipta
    // dahulu supaya trigger auto-pautkan akaun ikut emel.
    let mesej = "Permohonan anda berjaya dihantar! Kami telah menghantar pautan pengesahan ke e-mel anda. Sila SEMAK E-MEL (termasuk folder Spam/Promosi), klik pautan untuk mengesahkan akaun, kemudian LOG MASUK untuk menyemak status permohonan anda (Menunggu → Diluluskan).";
    if (nakAkaun) {
      const { error: eSignup } = await supabase.auth.signUp({
        email: emel,
        password: kataLaluan,
        options: {
          data: { nama },
          emailRedirectTo:
            typeof window !== "undefined" ? `${window.location.origin}/selamat-datang` : undefined,
        },
      });
      if (eSignup) {
        const dah = eSignup.message?.toLowerCase().includes("already");
        mesej = dah
          ? "Permohonan ahli anda telah direkod. Oleh kerana e-mel ini sudah mempunyai akaun (contohnya akaun pembekal), akaun sedia ada anda akan DIPAUTKAN secara automatik sebagai ahli kariah apabila anda log masuk semula. Sila log masuk seperti biasa."
          : `Permohonan anda telah direkod, tetapi akaun portal tidak dapat dicipta — ${eSignup.message}. Sila pastikan e-mel anda betul, atau hubungi admin surau.`;
      }
    }
    setHantar(false);
    setSelesai({ ok: true, msg: mesej });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (selesai?.ok) {
    return (
      <div className="mx-auto max-w-lg rounded-xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">✓</div>
        <h1 className="text-xl font-bold text-slate-900">Terima kasih!</h1>
        <p className="mt-2 text-left text-slate-600">{selesai.msg}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/masuk" className="inline-block rounded-lg bg-surau px-5 py-2.5 font-semibold text-white hover:bg-surau-dark">Log Masuk Portal</Link>
          <Link href="/" className="inline-block rounded-lg border border-surau/40 px-5 py-2.5 font-semibold text-surau hover:bg-surau/10">Kembali ke Utama</Link>
        </div>
      </div>
    );
  }

  // ---------- PERINGKAT 1: Gate — semak No. KP ----------
  if (peringkat === "semak") {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Pendaftaran Ahli Kariah</h1>
          <p className="mt-1 text-sm text-slate-600">Kariah: <b>{namaSurau}</b></p>
        </div>
        <form onSubmit={semakKp} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">No. Kad Pengenalan</label>
            <input
              className="inp"
              value={semakNoKp}
              onChange={(e) => setSemakNoKp(e.target.value)}
              placeholder="cth: 850505015123"
              inputMode="numeric"
              autoFocus
            />
            <p className="mt-1 text-xs text-slate-500">Masukkan No. KP untuk semak status keahlian anda dahulu.</p>
          </div>
          {semakRalat && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{semakRalat}</div>}
          <button disabled={semakSedang} className="w-full rounded-lg bg-surau px-6 py-3 font-semibold text-white hover:bg-surau-dark disabled:opacity-60">
            {semakSedang ? "Menyemak…" : "Semak"}
          </button>
          <p className="text-center text-sm">
            <Link href="/" className="text-slate-500 hover:underline">← Kembali ke laman utama</Link>
          </p>
        </form>
        <style jsx global>{`.inp{width:100%;border-radius:.5rem;border:1px solid #cbd5e1;padding:.5rem .75rem;font-size:.875rem;outline:none}.inp:focus{border-color:#b8860b;box-shadow:0 0 0 2px rgba(184,134,11,.2)}`}</style>
      </div>
    );
  }

  // ---------- PERINGKAT 1b: Rekod dijumpai → sahkan identiti (4 digit telefon) ----------
  if (peringkat === "sahkan") {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-700">!</div>
          <h1 className="text-2xl font-bold text-slate-900">Pendaftaran Anda Belum Selesai</h1>
          <p className="mt-2 text-sm text-slate-600">
            {ahliNama ? <><b>{ahliNama}</b>, anda dah isi borang awal — </> : null}
            <b>tapi keahlian belum disahkan.</b> Tinggal 2 langkah je: sahkan identiti, kemudian lengkapkan butiran (alamat, gambar IC, e-tandatangan). Ambil masa lebih kurang 3 minit.
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-800">
          <b>Langkah 1 dari 2</b> · Sahkan identiti anda
        </div>
        <form onSubmit={sahkanTelefon} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">4 Digit Akhir No. Telefon</label>
            <input
              className="inp tracking-widest"
              value={tel4}
              onChange={(e) => setTel4(e.target.value.replace(/\D/g, ""))}
              placeholder="cth: 5495"
              inputMode="numeric"
              maxLength={4}
              autoFocus
            />
            <p className="mt-1 text-xs text-slate-500">Masukkan 4 digit akhir no. telefon yang anda beri semasa pendaftaran / borang dahulu.</p>
          </div>
          {tel4Ralat && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{tel4Ralat}</div>}
          <button disabled={tel4Sedang} className="w-full rounded-lg bg-surau px-6 py-3 font-semibold text-white hover:bg-surau-dark disabled:opacity-60">
            {tel4Sedang ? "Menyemak…" : "Sahkan & Teruskan"}
          </button>
          <p className="text-center text-sm">
            <button type="button" onClick={() => { setPeringkat("semak"); setTel4(""); setTel4Ralat(""); }} className="text-slate-500 hover:underline">← Semak No. KP lain</button>
          </p>
        </form>
        <style jsx global>{`.inp{width:100%;border-radius:.5rem;border:1px solid #cbd5e1;padding:.5rem .75rem;font-size:.875rem;outline:none}.inp:focus{border-color:#b8860b;box-shadow:0 0 0 2px rgba(184,134,11,.2)}`}</style>
      </div>
    );
  }

  // ---------- PERINGKAT 2c: Sudah ada akaun log masuk → arahkan LOG MASUK ----------
  if (peringkat === "sudah") {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">✓</div>
          <h1 className="text-2xl font-bold text-slate-900">Anda Sudah Berdaftar</h1>
          <p className="mt-2 text-sm text-slate-600">
            {ahliNama ? <>Salam, <b>{ahliNama}</b>. </> : null}
            Anda sudah menjadi ahli kariah &amp; <b>sudah ada akaun log masuk</b>
            {disahkanRec ? <> (maklumat telah disahkan)</> : null}. Tak perlu daftar semula — sila <b>log masuk</b> untuk akses Portal Ahli.
          </p>
        </div>
        <div className="rounded-xl bg-white p-6 text-center shadow-sm">
          {emelRec && <p className="mb-3 text-sm text-slate-500">Akaun anda: <b className="text-slate-800">{emelRec}</b></p>}
          <Link href="/masuk" className="inline-block w-full rounded-lg bg-surau px-6 py-3 font-semibold text-white hover:bg-surau-dark">Log Masuk Portal Ahli</Link>
          <p className="mt-3 text-xs text-slate-500">
            Lupa kata laluan? <Link href="/lupa-kata-laluan" className="font-medium text-surau hover:underline">Set semula di sini</Link>
          </p>
        </div>
        <p className="text-center">
          <button type="button" onClick={() => setPeringkat("semak")} className="text-xs text-slate-500 hover:underline">← Semak No. KP lain</button>
        </p>
      </div>
    );
  }

  // ---------- PERINGKAT 2b: Ahli sedia ada (belum ada akaun) → cipta akaun log masuk ----------
  if (peringkat === "akaun") {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">✓ Identiti disahkan</div>
          <h1 className="text-2xl font-bold text-slate-900">Cipta Akaun Log Masuk</h1>
          <p className="mt-1 text-sm text-slate-600">
            {ahliNama ? <><b>{ahliNama}</b> — </> : null}
            cipta akaun untuk akses Portal Ahli
            {disahkanRec ? "." : <> &amp; lengkapkan butiran anda.</>}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-800">
          <b>Langkah 2 dari 2</b>{!disahkanRec && <> · Selepas log masuk, <b>lengkapkan butiran</b> (alamat, gambar IC, e-tandatangan) untuk sahkan keahlian.</>}
        </div>
        {selesai && !selesai.ok && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{selesai.msg}</div>
        )}
        <form onSubmit={daftarAkaun} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">E-mel *</label>
            <input className="inp" type="email" value={emel} onChange={(e) => setEmel(e.target.value)} placeholder="emel@contoh.com" autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Kata Laluan *</label>
            <input className="inp" type="password" value={kataLaluan} onChange={(e) => setKataLaluan(e.target.value)} placeholder="Sekurang-kurangnya 6 aksara" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ulang Kata Laluan *</label>
            <input className="inp" type="password" value={kataLaluan2} onChange={(e) => setKataLaluan2(e.target.value)} placeholder="Taip semula kata laluan" />
          </div>
          <button disabled={hantar} className="w-full rounded-lg bg-surau px-6 py-3 font-semibold text-white hover:bg-surau-dark disabled:opacity-60">
            {hantar ? "Menyimpan…" : "Cipta Akaun"}
          </button>
          <p className="text-center text-sm">
            <button type="button" onClick={() => { setPeringkat("semak"); setSelesai(null); }} className="text-slate-500 hover:underline">← Semak No. KP lain</button>
          </p>
        </form>
        <p className="text-center text-xs text-slate-500">
          Sudah ada akaun? <Link href="/masuk" className="font-medium text-surau hover:underline">Log masuk di sini</Link>
        </p>
        <style jsx global>{`.inp{width:100%;border-radius:.5rem;border:1px solid #cbd5e1;padding:.5rem .75rem;font-size:.875rem;outline:none}.inp:focus{border-color:#b8860b;box-shadow:0 0 0 2px rgba(184,134,11,.2)}`}</style>
      </div>
    );
  }

  // ---------- PERINGKAT 2a: Belum ada → borang penuh ----------
  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-red-700">Anda Belum Berdaftar</h1>
        <p className="mt-1 text-sm text-slate-600">Kariah: <b>{namaSurau}</b> · Selaras borang rasmi JAIS. Medan bertanda * wajib.</p>
        <button type="button" onClick={() => setPeringkat("semak")} className="mt-2 text-xs text-slate-500 hover:underline">← Semak No. KP semula</button>
      </div>

      <div className="rounded-xl border-2 border-red-400 bg-red-50 p-4 text-sm">
        <div className="font-bold text-red-700">🔴 Anda belum berdaftar sebagai ahli kariah</div>
        <p className="mt-1 text-red-600">No. KP anda tiada dalam rekod. Sila lengkapkan borang di bawah untuk mendaftar &amp; sertai kariah Surau Ar Raudhah.</p>
      </div>

      {selesai && !selesai.ok && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{selesai.msg}</div>
      )}

      {/* BAHAGIAN A */}
      <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-surau">BAHAGIAN A · Butiran Ahli Kariah</h2>

        <Field label="Gelaran *">
          <select className="inp" value={gelaran} onChange={(e) => setGelaran(e.target.value)}>
            <option value="">— Tiada —</option>
            {GELARAN.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </Field>

        <Field label="1. Nama Pemohon *">
          <input className="inp uppercase" value={nama} onChange={(e) => setNama(e.target.value.toUpperCase())} />
        </Field>

        <Field label="2. No. Kad Pengenalan *">
          <input className="inp" value={noKp} onChange={(e) => setNoKp(e.target.value)} placeholder="cth: 850505015123" />
        </Field>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Gambar Kad Pengenalan (letak kad dalam kotak, kemudian snap) *</span>
          <div className="grid gap-3 sm:grid-cols-2">
            <KameraKp label="IC Depan" ada={!!urlDepan} sedang={muatNaik === "depan"} onBlob={(b) => naikKp("depan", b)} />
            <KameraKp label="IC Belakang" ada={!!urlBelakang} sedang={muatNaik === "belakang"} onBlob={(b) => naikKp("belakang", b)} />
          </div>
          <p className="mt-1 text-xs text-slate-500">Kamera akan tunjuk kotak kuning bernisbah kad — jajarkan kad dalam kotak, pastikan jelas & tidak silau, kemudian tekan Snap.</p>
        </div>

        <Field label="3. Alamat Dalam Kad Pengenalan / Passport *">
          <textarea className="inp uppercase" rows={2} value={alamatKp} onChange={(e) => setAlamatKp(e.target.value.toUpperCase())} />
        </Field>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={alamatSama}
            onChange={(e) => { setAlamatSama(e.target.checked); if (e.target.checked) setAlamatSekarang(alamatKp); }}
          />
          Alamat tempat tinggal sama seperti alamat dalam KP
        </label>
        {!alamatSama && (
          <Field label="4. Alamat Tempat Tinggal Sekarang *">
            <textarea className="inp uppercase" rows={2} value={alamatSekarang} onChange={(e) => setAlamatSekarang(e.target.value.toUpperCase())} />
          </Field>
        )}

        <Field label="Kawasan / Fasa Kediaman">
          <select className="inp" value={kawasan} onChange={(e) => setKawasan(e.target.value)}>
            <option value="">— Pilih fasa anda —</option>
            {KAWASAN_PILIHAN.map((k) => (
              <option key={k.kod} value={k.kod}>{k.nama}{k.jalan ? ` (Jalan ${k.jalan})` : ""}</option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="5. No. Telefon Rumah">
            <input className="inp" value={telRumah} onChange={(e) => setTelRumah(e.target.value)} />
          </Field>
          <Field label="No. H/P *">
            <input className="inp" value={hp} onChange={(e) => setHp(e.target.value)} />
          </Field>
          <Field label="E-mel *">
            <input className="inp" type="email" value={emel} onChange={(e) => setEmel(e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="6. Status Perkahwinan">
            <select className="inp" value={statusKahwin} onChange={(e) => setStatusKahwin(e.target.value)}>
              <option value="bujang">Bujang</option>
              <option value="berkahwin">Sudah Berkahwin</option>
              <option value="duda">Duda</option>
              <option value="janda">Janda</option>
            </select>
          </Field>
          <Field label="7. Tempoh Masa Telah Menetap *">
            <div className="flex gap-2">
              <input className="inp" type="number" min="0" value={tempohNilai} onChange={(e) => setTempohNilai(e.target.value)} />
              <select className="inp w-28" value={tempohUnit} onChange={(e) => setTempohUnit(e.target.value)}>
                <option value="tahun">Tahun</option>
                <option value="bulan">Bulan</option>
              </select>
            </div>
          </Field>
        </div>
      </section>

      {/* Tanggungan */}
      <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Tanggungan / Isi Rumah</h2>
          <button type="button" onClick={() => setTanggungan((t) => [...t, kosong()])} className="rounded-lg bg-surau/10 px-3 py-1.5 text-sm font-semibold text-surau hover:bg-surau/20">+ Tambah</button>
        </div>
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          <b>Penting untuk khairat:</b> senaraikan pasangan & anak (21 tahun ke bawah). Layak juga:
          anak OKU (tanpa had umur) & anak masih belajar (hingga 25 tahun), serta ibu/bapa yang
          ditanggung. Isi <b>Nama penuh</b> & <b>No. KP / MyKid</b> setiap anak.
        </p>
        {tanggungan.length === 0 && <p className="text-sm text-slate-500">Tiada tanggungan ditambah.</p>}
        {tanggungan.map((t, i) => {
          const status = layakKhairat(t);
          return (
          <div key={i} className="space-y-3 rounded-lg border border-slate-200 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="inp" value={t.hubungan} onChange={(e) => ubahT(i, "hubungan", e.target.value)}>
                <option value="pasangan">Pasangan</option>
                <option value="anak">Anak</option>
                <option value="ibu">Ibu</option>
                <option value="bapa">Bapa</option>
                <option value="lain">Lain-lain</option>
              </select>
              <input className="inp" placeholder="No. KP / MyKid" value={t.no_kp} onChange={(e) => ubahKpTgg(i, e.target.value)} />
            </div>
            <input className="inp uppercase" placeholder="Nama penuh" value={t.nama} onChange={(e) => ubahT(i, "nama", e.target.value.toUpperCase())} />
            {(() => {
              const dob = tarikhLahirDariKp(t.no_kp);
              const umur = umurDari(t.tarikh_lahir, t.no_kp);
              if (dob || umur !== null) {
                return (
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Tarikh lahir (auto dari No. KP): <b>{dob ?? t.tarikh_lahir}</b>
                    {umur !== null ? <> · <b>{umur} tahun</b></> : null}
                  </div>
                );
              }
              return (
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-500">Tarikh lahir (No. KP tidak lengkap — isi manual)</span>
                  <input className="inp" type="date" value={t.tarikh_lahir} onChange={(e) => ubahT(i, "tarikh_lahir", e.target.value)} />
                </label>
              );
            })()}
            {t.hubungan === "anak" && (
              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={t.oku} onChange={(e) => ubahT(i, "oku", e.target.checked)} /> Anak OKU
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={t.masih_belajar} onChange={(e) => ubahT(i, "masih_belajar", e.target.checked)} /> Masih belajar sepenuh masa
                </label>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${status.layak ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                {status.layak ? `✓ Dilindungi khairat · ${status.sebab}` : `Tidak dilindungi · ${status.sebab}`}
              </span>
              <button type="button" onClick={() => setTanggungan((t) => t.filter((_, idx) => idx !== i))} className="text-sm font-medium text-red-600 hover:underline">Padam</button>
            </div>
          </div>
          );
        })}
      </section>

      {/* Khairat — dipaparkan hanya bila langganan dibuka (toggle admin) */}
      {khDibuka && (
        <section className="rounded-xl border-2 border-surau/30 bg-surau/5 p-5">
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1" checked={sertaiKhairat} onChange={(e) => setSertaiKhairat(e.target.checked)} />
            <span>
              <span className="font-semibold text-slate-900">Saya ingin menyertai Skim Khairat Kematian</span>
              <span className="mt-1 block text-sm text-slate-600">Yuran <b>RM{YURAN_KHAIRAT_TAHUNAN} setahun</b>, pampasan tetap setiap kematian ahli/tanggungan dilindungi. Bayaran dibuat selepas log masuk ke Portal Ahli.</span>
            </span>
          </label>
        </section>
      )}

      {/* Akaun Portal Ahli (WAJIB) */}
      <section className="space-y-3 rounded-xl border-2 border-surau/30 bg-surau/5 p-5">
        <h2 className="font-semibold text-slate-900">Akaun Portal Ahli <span className="text-sm font-semibold text-red-600">(wajib)</span></h2>
        <p className="text-sm text-slate-600">
          Cipta kata laluan untuk akaun portal anda — anda perlu log masuk untuk semak status keahlian,
          khairat, resit & sumbangan. Akaun guna <b>E-mel</b> yang anda isi di atas.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="inp" type="password" required placeholder="Kata laluan (min. 6 aksara) *" value={kataLaluan} onChange={(e) => setKataLaluan(e.target.value)} />
          <input className="inp" type="password" required placeholder="Sahkan kata laluan *" value={kataLaluan2} onChange={(e) => setKataLaluan2(e.target.value)} />
        </div>
      </section>

      {/* Pengesahan: e-tandatangan + swafoto */}
      <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-surau">Pengesahan Identiti</h2>
        <p className="text-xs text-slate-500">Sila turunkan tandatangan & ambil swafoto sebagai bukti pengesahan diri.</p>
        <div className="rounded-lg border border-surau/20 bg-surau/5 p-3 text-xs leading-relaxed text-slate-600">
          <b className="text-slate-800">Kenapa perlu swafoto?</b> Swafoto memastikan orang yang mendaftar benar-benar pemilik Kad Pengenalan tersebut —
          bagi mengelak penyalahgunaan atau penyamaran identiti, dan melindungi hak ahli (terutama pampasan khairat kematian).
          Gambar ini <b>sulit</b>, disimpan dengan selamat, dan hanya boleh dilihat oleh pentadbir surau yang dibenarkan.
          Lihat <Link href="/dasar-privasi" className="font-medium text-surau underline">Dasar Privasi</Link>.
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">e-Tandatangan *</span>
          <SignaturePad onChange={(v) => { setTtdBaru(v); if (selesai && !selesai.ok) setSelesai(null); }} />
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Swafoto (Selfie) *</span>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center hover:border-surau">
            <input type="file" accept="image/*" capture="user" className="hidden" onChange={snapSelfie} />
            {urlSelfie ? <span className="text-sm font-medium text-green-600">✓ Swafoto ada — ketik untuk ambil semula</span>
              : muatSelfie ? <span className="text-sm text-amber-600">Memuat naik…</span>
              : <><span className="text-2xl"></span><span className="mt-1 text-sm font-medium text-slate-700">Ambil Swafoto</span><span className="text-xs text-slate-400">Kamera hadapan akan terbuka</span></>}
          </label>
        </div>
      </section>

      {/* Pengakuan (Bahagian A no.8) */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1" checked={pengakuan} onChange={(e) => setPengakuan(e.target.checked)} />
          <span className="text-sm text-slate-700">
            <b>8.</b> Saya mengaku bahawa segala maklumat yang terkandung dalam Bahagian A adalah <b>benar</b>. *
          </span>
        </label>
        <label className="mt-3 flex items-start gap-3 border-t pt-3">
          <input type="checkbox" className="mt-1" checked={setuju} onChange={(e) => setSetuju(e.target.checked)} />
          <span className="text-sm text-slate-700">
            Saya telah membaca & bersetuju dengan{" "}
            <a href="/dasar-privasi" target="_blank" className="font-medium text-surau hover:underline">Dasar Privasi</a> dan{" "}
            <a href="/terma" target="_blank" className="font-medium text-surau hover:underline">Terma Penggunaan</a>,
            serta memberi persetujuan pengumpulan data peribadi (termasuk swafoto & salinan IC) mengikut PDPA. *
          </span>
        </label>
      </section>

      {selesai && !selesai.ok && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-700">
          {selesai.msg}
        </div>
      )}
      <button type="submit" disabled={hantar || muatNaik !== ""} className="w-full rounded-lg bg-surau px-6 py-3 font-semibold text-white hover:bg-surau-dark disabled:opacity-60">
        {hantar ? "Menghantar…" : "Hantar Permohonan"}
      </button>

      <style jsx global>{`
        .inp { width: 100%; border-radius: .5rem; border: 1px solid #cbd5e1; padding: .5rem .75rem; font-size: .875rem; outline: none; }
        .inp:focus { border-color: #0f766e; box-shadow: 0 0 0 2px rgba(15,118,110,.2); }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

