export interface TallyBarProps {
  dCount: number;
  rCount: number;
  otherCount?: number;
  otherLabel?: string;
  otherColor?: string;
  total: number;
  /** Draw a tick mark at this value (e.g. 270 electoral votes, 51 Senate seats). */
  majorityMark?: number;
  dColor?: string;
  rColor?: string;
  dCaption?: string;
  rCaption?: string;
}

export function TallyBar({
  dCount,
  rCount,
  otherCount = 0,
  otherLabel = "Toss-up",
  otherColor = "#d4d4d8",
  total,
  majorityMark,
  dColor = "#2563eb",
  rColor = "#dc2626",
  dCaption = "Democratic",
  rCaption = "Republican",
}: TallyBarProps) {
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const markPct = majorityMark ? (majorityMark / total) * 100 : undefined;

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between text-sm font-semibold">
        <span style={{ color: dColor }}>
          {dCount} {dCaption}
        </span>
        {otherCount > 0 && (
          <span className="text-gray-500 dark:text-gray-400">
            {otherCount} {otherLabel}
          </span>
        )}
        <span style={{ color: rColor }}>
          {rCount} {rCaption}
        </span>
      </div>
      <div className="relative flex h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${pct(dCount)}%`, backgroundColor: dColor }}
        />
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${pct(otherCount)}%`, backgroundColor: otherColor }}
        />
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${pct(rCount)}%`, backgroundColor: rColor }}
        />
        {markPct !== undefined && (
          <div
            className="absolute top-0 h-full w-0.5 bg-gray-900/70 dark:bg-white/80"
            style={{ left: `${markPct}%` }}
            title={`${majorityMark} needed`}
          />
        )}
      </div>
      {majorityMark !== undefined && (
        <div className="mt-1 text-center text-[11px] text-gray-500 dark:text-gray-400">
          {majorityMark} needed for majority
        </div>
      )}
    </div>
  );
}
