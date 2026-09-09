"use client";

import { useState } from "react";

/**
 * Butang padam dengan pengesahan dua langkah (double confirmation).
 * Klik 1: butang bertukar jadi "Pasti padam? Ya / Tak".
 * Klik "Ya, padam": baru betul-betul jalankan onPadam.
 * Ini elak salah tekan — mesti reconfirm dulu sebelum apa-apa dipadam.
 */
export default function ButangPadam({
  onPadam,
  label = "padam",
  soalan = "Pasti padam?",
  variant = "link",
  disabled = false,
}: {
  onPadam: () => void | Promise<void>;
  label?: string;
  soalan?: string;
  variant?: "link" | "butang";
  disabled?: boolean;
}) {
  const [sah, setSah] = useState(false);
  const [busy, setBusy] = useState(false);

  async function jalankan() {
    setBusy(true);
    try {
      await onPadam();
    } finally {
      setBusy(false);
      setSah(false);
    }
  }

  if (sah) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-xs font-semibold text-red-600">{soalan}</span>
        <button
          type="button"
          onClick={jalankan}
          disabled={busy}
          className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? "Memadam…" : "Ya, padam"}
        </button>
        <button
          type="button"
          onClick={() => setSah(false)}
          disabled={busy}
          className="rounded-md border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
        >
          Tak
        </button>
      </span>
    );
  }

  if (variant === "butang") {
    return (
      <button
        type="button"
        onClick={() => setSah(true)}
        disabled={disabled}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setSah(true)}
      disabled={disabled}
      className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
    >
      {label}
    </button>
  );
}
