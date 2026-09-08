"use client";
export default function ButangCetak({ label = "🖨 Cetak / PDF" }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="print-hide rounded-lg bg-surau px-4 py-2 text-sm font-semibold text-white hover:bg-surau-dark">
      {label}
    </button>
  );
}
