import Link from "next/link";

// Small charts drawn with plain HTML/SVG on the server: no chart library, no client
// JavaScript. The numbers are always printed as text next to the shapes, so nothing
// depends on colour or on being able to see the graphic.

export type BarItem = { key: string; label: string; sublabel?: string; value: number; href?: string };

export function BarChart({
  items,
  color = "var(--brand)",
  unit = "ครั้ง",
  ariaLabel,
}: {
  items: BarItem[];
  color?: string;
  unit?: string;
  ariaLabel: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ol className="grid gap-3" aria-label={ariaLabel}>
      {items.map((item) => {
        const width = item.value === 0 ? 0 : Math.max(2, (item.value / max) * 100);
        return (
          <li key={item.key} className="grid gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                {item.href ? (
                  <Link href={item.href} className="font-medium hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-medium">{item.label}</span>
                )}
                {item.sublabel && <span className="text-muted-foreground ml-2 text-xs">{item.sublabel}</span>}
              </span>
              <span className="shrink-0 tabular-nums">
                <span className="font-semibold">{item.value.toLocaleString("th-TH")}</span>{" "}
                <span className="text-muted-foreground text-xs">{unit}</span>
              </span>
            </div>
            <div className="bg-muted h-2.5 overflow-hidden rounded-full" aria-hidden>
              <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export type DonutSegment = { key: string; label: string; value: number; color: string };

// One circle per segment, drawn with stroke-dasharray on a circle whose circumference is 100,
// so a segment of 37 % is simply "37 63".
export function DonutChart({
  segments,
  total,
  centerLabel,
  ariaLabel,
}: {
  segments: DonutSegment[];
  total: number;
  centerLabel: string;
  ariaLabel: string;
}) {
  const radius = 15.9155;
  const shares = segments.map((s) => (total ? (s.value / total) * 100 : 0));
  // where each segment starts, as a running total; 25 moves the start to 12 o'clock
  const starts = shares.map((_, i) => 25 - shares.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
      <svg viewBox="0 0 42 42" role="img" aria-label={ariaLabel} className="size-36 shrink-0">
        <circle cx="21" cy="21" r={radius} fill="none" stroke="var(--muted)" strokeWidth="6" />
        {segments.map((seg, i) => (
          <circle
            key={seg.key}
            cx="21"
            cy="21"
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth="6"
            strokeDasharray={`${shares[i]} ${100 - shares[i]}`}
            strokeDashoffset={starts[i]}
          />
        ))}
        <text x="21" y="20.5" textAnchor="middle" className="fill-foreground text-[7px] font-semibold">
          {total.toLocaleString("th-TH")}
        </text>
        <text x="21" y="26.5" textAnchor="middle" className="fill-muted-foreground text-[3.4px]">
          {centerLabel}
        </text>
      </svg>

      <ul className="grid min-w-44 flex-1 gap-2 text-sm">
        {segments.map((seg) => (
          <li key={seg.key} className="flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: seg.color }} aria-hidden />
            <span className="min-w-0 flex-1 truncate">{seg.label}</span>
            <span className="tabular-nums">
              <span className="font-semibold">{seg.value.toLocaleString("th-TH")}</span>
              <span className="text-muted-foreground ml-1 text-xs">
                ({total ? Math.round((seg.value / total) * 100) : 0}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
