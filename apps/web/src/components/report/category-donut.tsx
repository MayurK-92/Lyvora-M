import { getCategoryStyle } from "@/lib/categories";

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface CategorySlice {
  category: string;
  count: number;
}

function toArcs(slices: CategorySlice[], total: number) {
  let consumed = 0;
  return slices.map((slice) => {
    const fraction = slice.count / total;
    const length = fraction * CIRCUMFERENCE;
    const arc = {
      ...slice,
      accent: getCategoryStyle(slice.category).accent,
      percent: Math.round(fraction * 100),
      dash: `${length} ${CIRCUMFERENCE}`,
      offset: -consumed,
    };
    consumed += length;
    return arc;
  });
}

/**
 * weekly_report_lyvora's donut + legend (lines 130–201). Slices are drawn with
 * stroke-dasharray offsets so no charting dependency is needed.
 */
export function CategoryDonut({ slices }: { slices: CategorySlice[] }) {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  if (total === 0) return null;

  const arcs = toArcs(slices, total);

  return (
    <div className="flex flex-col items-center gap-xl md:flex-row">
      <div className="relative size-48 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="transparent"
            strokeWidth="16"
            className="text-surface-container-high"
            stroke="currentColor"
          />
          {arcs.map((arc) => (
            <circle
              key={arc.category}
              cx="50"
              cy="50"
              r={RADIUS}
              fill="transparent"
              strokeWidth="16"
              stroke={arc.accent}
              strokeDasharray={arc.dash}
              strokeDashoffset={arc.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-headline-lg text-on-surface">{total}</span>
          <span className="text-label-sm text-on-surface-variant">Memories</span>
        </div>
      </div>

      <ul className="w-full flex-1 space-y-md">
        {arcs.map((arc) => (
          <li key={arc.category} className="flex items-center justify-between gap-md">
            <div className="flex min-w-0 items-center gap-sm">
              <span
                aria-hidden="true"
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: arc.accent }}
              />
              <span className="truncate text-label-md text-on-surface">{arc.category}</span>
            </div>
            <div className="flex shrink-0 items-center gap-md">
              <span className="text-body-md tabular-nums text-on-surface-variant">
                {arc.percent}%
              </span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-container">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${arc.percent}%`, backgroundColor: arc.accent }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
