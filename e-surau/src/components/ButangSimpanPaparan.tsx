"use client";

import { useFormStatus } from "react-dom";

// Butang simpan dengan keadaan "sedang menyimpan" — beri maklum balas segera.
export default function ButangSimpanPaparan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-surau px-6 py-2.5 text-sm font-bold text-white hover:bg-surau-dark disabled:opacity-60"
    >
      {pending ? "Menyimpan…" : "Simpan Tetapan & Poster"}
    </button>
  );
}
