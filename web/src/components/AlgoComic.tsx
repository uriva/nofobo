const IMG_W = 572;
const IMG_H = 1024;

interface PanelBox {
  x: number;
  y: number;
  w: number;
  h: number;
  alt: string;
}

const PANELS: PanelBox[] = [
  {
    x: 9,
    y: 46,
    w: 274,
    h: 229,
    alt: "Panel 1: FOBO (Fear Of Better Option) is real and ruining dating when you have 247 matches and can't pick one.",
  },
  {
    x: 289,
    y: 46,
    w: 274,
    h: 229,
    alt: "Panel 2: In 1962, mathematicians Gale & Shapley proved you can find the best stable match by comparing two people at a time.",
  },
  {
    x: 9,
    y: 282,
    w: 274,
    h: 230,
    alt: "Panel 3: Just pick who you vibe with more — Alex or Jordan? No overthinking, just two at a time.",
  },
  {
    x: 289,
    y: 282,
    w: 274,
    h: 230,
    alt: "Panel 4: Your personal ELO scores are private to you. Each comparison updates your personal preference ranking.",
  },
  {
    x: 9,
    y: 519,
    w: 274,
    h: 230,
    alt: "Panel 5: How Gale-Shapley works: everyone proposes to their #1 choice, keeps the best offer, and repeats until everyone is matched.",
  },
  {
    x: 289,
    y: 519,
    w: 274,
    h: 230,
    alt: "Panel 6: The guarantee: no two unmatched people would rather be with each other. The matching is mathematically stable.",
  },
  {
    x: 9,
    y: 756,
    w: 274,
    h: 229,
    alt: "Panel 7: You get ONE match — the one person the algorithm says is best for you, so you can give them your full attention.",
  },
  {
    x: 289,
    y: 756,
    w: 274,
    h: 229,
    alt: "Panel 8: Not wondering if there's someone better out there — the math already checked.",
  },
];

export default function AlgoComic() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {PANELS.map((p, idx) => (
        <div
          key={idx}
          className="relative w-full overflow-hidden rounded-xl border border-grape-700/80 bg-white shadow-md"
          style={{ aspectRatio: `${p.w} / ${p.h}` }}
        >
          <img
            src="/nofobo-comic.jpg"
            alt={p.alt}
            loading="lazy"
            className="absolute max-w-none select-none pointer-events-none"
            style={{
              width: `${(IMG_W / p.w) * 100}%`,
              left: `${-(p.x / p.w) * 100}%`,
              top: `${-(p.y / p.h) * 100}%`,
            }}
          />
          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-[#0f0a1a]/80 text-white text-xs font-bold flex items-center justify-center border border-grape-500/50 sm:hidden">
            {idx + 1}
          </div>
        </div>
      ))}
    </div>
  );
}
