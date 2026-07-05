"use client";

// Speedometer-style gauge: needle shows spend pace against the monthly budget.
// Green zone = under pace, amber = near/at pace, red = over budget pace.
export default function BudgetGauge({
  spent,
  budget,
  paceFraction,
}: {
  spent: number;
  budget: number;
  paceFraction: number; // fraction of the month elapsed (0..1)
}) {
  const frac = budget > 0 ? Math.min(spent / budget, 1.25) : 0;
  // Gauge sweeps 180deg from -90 (left) to +90 (right); full scale = 125% of budget.
  const scale = (v: number) => (Math.min(v, 1.25) / 1.25) * 180 - 90;
  const needleAngle = scale(frac);
  const paceAngle = scale(Math.min(paceFraction, 1.25));

  const cx = 150;
  const cy = 150;
  const r = 115;

  function arcPath(startDeg: number, endDeg: number, radius: number) {
    const s = ((startDeg - 90) * Math.PI) / 180;
    const e = ((endDeg - 90) * Math.PI) / 180;
    const x1 = cx + radius * Math.sin(s + Math.PI / 2) * -1;
    const y1 = cy - radius * Math.cos(s + Math.PI / 2) * -1;
    const x2 = cx + radius * Math.sin(e + Math.PI / 2) * -1;
    const y2 = cy - radius * Math.cos(e + Math.PI / 2) * -1;
    void x1; void y1; void x2; void y2;
    // Simpler param: angle from -90..90 where -90 is left horizontal
    const toXY = (deg: number, rad: number) => {
      const a = ((deg - 90) * Math.PI) / 180;
      return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
    };
    const [sx, sy] = toXY(startDeg, radius);
    const [ex, ey] = toXY(endDeg, radius);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${radius} ${radius} 0 ${large} 1 ${ex} ${ey}`;
  }

  const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const overPace = budget > 0 && spent / budget > paceFraction + 0.02;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 300 190" className="w-full max-w-[340px]">
        {/* zone arcs: 0-80% green, 80-100% amber, 100-125% red */}
        <path d={arcPath(-90, scale(0.8), r)} stroke="#bbf7d0" strokeWidth="18" fill="none" strokeLinecap="round" />
        <path d={arcPath(scale(0.8), scale(1.0), r)} stroke="#fde68a" strokeWidth="18" fill="none" />
        <path d={arcPath(scale(1.0), 90, r)} stroke="#fecaca" strokeWidth="18" fill="none" strokeLinecap="round" />
        {/* progress arc */}
        {budget > 0 && frac > 0.005 && (
          <path
            d={arcPath(-90, needleAngle, r)}
            stroke={frac >= 1 ? "#dc2626" : frac >= 0.8 ? "#d97706" : "#16a34a"}
            strokeWidth="18"
            fill="none"
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        )}
        {/* pace marker (where you "should" be today) */}
        {budget > 0 && (
          <g transform={`rotate(${paceAngle} ${cx} ${cy})`}>
            <line x1={cx} y1={cy - r - 14} x2={cx} y2={cy - r + 14} stroke="#4c5e85" strokeWidth="2.5" strokeDasharray="3 2" />
          </g>
        )}
        {/* ticks */}
        {[0, 0.25, 0.5, 0.75, 1, 1.25].map((v) => (
          <g key={v} transform={`rotate(${scale(v)} ${cx} ${cy})`}>
            <line x1={cx} y1={cy - r + 16} x2={cx} y2={cy - r + 24} stroke="#c3c6d6" strokeWidth="2" />
          </g>
        ))}
        {/* needle */}
        <g
          transform={`rotate(${budget > 0 ? needleAngle : -90} ${cx} ${cy})`}
          className="transition-transform duration-700 ease-out"
        >
          <polygon points={`${cx - 5},${cy} ${cx + 5},${cy} ${cx},${cy - r + 30}`} fill="#101c2d" />
        </g>
        <circle cx={cx} cy={cy} r="9" fill="#101c2d" />
        <circle cx={cx} cy={cy} r="4" fill="#f9f9ff" />
      </svg>
      <div className="text-center -mt-4">
        <p className="text-3xl font-semibold tracking-tight">
          {budget > 0 ? `${pct}%` : "—"}
        </p>
        <p className={`text-xs mt-0.5 font-medium ${overPace ? "text-tier-amber" : "text-tier-green"}`}>
          {budget === 0
            ? "Set a monthly budget to start"
            : overPace
              ? "Ahead of pace — slow down a little"
              : "On track for this month"}
        </p>
      </div>
    </div>
  );
}
