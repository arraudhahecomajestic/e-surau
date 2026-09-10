"use client";

export type CartaItem = { jawatan: string; nama: string | null; gambar_url: string | null };

function inisial(nama: string) {
  const p = (nama || "").replace(/\bBin\b|\bBinti\b|\bBt\b/gi, "").trim().split(/\s+/).filter(Boolean);
  return ((p[0] || " ")[0] + (p[1] || " ")[0]).toUpperCase() || "—";
}
function pad(list: CartaItem[]): CartaItem[] {
  if (!list.length) return [];
  let u = [...list];
  while (u.length < 10) u = u.concat(list);
  return u;
}

export default function CartaGerak({ carta }: { carta: CartaItem[] }) {
  if (!carta || carta.length === 0) {
    return <div className="rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-sm">Carta organisasi akan dikemas kini tidak lama lagi.</div>;
  }

  const isJ = (c: CartaItem, re: RegExp) => re.test(c.jawatan || "");
  const layer1 = carta.filter((c) => isJ(c, /pengerusi|setiausaha|bendahari/i));
  const layer2 = carta.filter((c) => isJ(c, /imam|bilal|siak/i));
  const idKira = (c: CartaItem) => `${c.jawatan}|${c.nama}`;
  const set12 = new Set([...layer1, ...layer2].map(idKira));
  const layer3 = carta.filter((c) => !set12.has(idKira(c)));

  const LAYERS: { label: string; list: CartaItem[]; kanan: boolean; laju: number }[] = [
    { label: "Jawatankuasa Induk", list: layer1, kanan: false, laju: 34 },
    { label: "Imam · Bilal · Siak", list: layer2, kanan: true, laju: 40 },
    { label: "Ahli Jawatankuasa & Petugas Lain", list: layer3, kanan: false, laju: 48 },
  ].filter((L) => L.list.length > 0);

  return (
    <div className="space-y-7">
      {LAYERS.map((L, li) => {
        const track = [...pad(L.list), ...pad(L.list)];
        return (
          <div key={li}>
            <div className="mb-3 flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wide text-surau-dark">{L.label}</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="cg-marquee">
              <div className={`cg-track ${L.kanan ? "cg-kanan" : ""}`} style={{ animationDuration: `${L.laju}s` }}>
                {track.map((c, i) => (
                  <div key={i} className="flex w-36 shrink-0 flex-col items-center text-center">
                    <div className="h-24 w-24 overflow-hidden rounded-full bg-gradient-to-br from-surau to-surau-dark shadow-md ring-4 ring-white">
                      {c.gambar_url
                        ? <img src={c.gambar_url} alt={c.nama ?? c.jawatan} className="h-full w-full object-cover" />
                        : <span className="grid h-full w-full place-content-center text-2xl font-extrabold text-white">{inisial(c.nama || c.jawatan)}</span>}
                    </div>
                    <div className="mt-2 text-[13px] font-bold leading-tight text-slate-900">{c.nama || "—"}</div>
                    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-surau-dark">{c.jawatan}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <style>{`
        .cg-marquee { overflow: hidden; position: relative; padding: 6px 0;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent); }
        .cg-track { display: flex; align-items: flex-start; gap: 1.5rem; width: max-content; animation: cg-scroll linear infinite; }
        .cg-track.cg-kanan { animation-name: cg-scroll-kanan; }
        .cg-marquee:hover .cg-track { animation-play-state: paused; }
        @keyframes cg-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes cg-scroll-kanan { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        @media (prefers-reduced-motion: reduce) { .cg-track { animation: none; flex-wrap: wrap; justify-content: center; } }
      `}</style>
    </div>
  );
}
