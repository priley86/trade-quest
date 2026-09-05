export function HistoryChart({ values }: { values: { date: string; cents: number }[] }) {
  if (values.length < 2) return null;
  const nums = values.map(v => v.cents), min = Math.min(...nums), max = Math.max(...nums), spread = Math.max(max - min, 1);
  const coords = values.map((v, i) => ({ x: 34 + i / (values.length - 1) * 732, y: 170 - (v.cents - min) / spread * 140 }));
  const path = coords.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  return <svg viewBox="0 0 800 220" className="history-chart" role="img" aria-label="Recorded holding value over time"><line x1="34" y1="30" x2="34" y2="170" stroke="#9bb5c5" /><line x1="34" y1="170" x2="766" y2="170" stroke="#9bb5c5" /><line x1="34" y1="100" x2="766" y2="100" stroke="#dce8ee" strokeDasharray="4 6" /><path d={path} fill="none" stroke="#087eaf" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />{coords.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#087eaf" strokeWidth="3" />)}<text x="20" y="35" textAnchor="end" fontSize="12">${(max/100).toFixed(2)}</text><text x="20" y="174" textAnchor="end" fontSize="12">${(min/100).toFixed(2)}</text><text x="34" y="195" fontSize="12">{values[0].date.slice(0,10)}</text><text x="650" y="195" fontSize="12">{values[values.length-1].date.slice(0,10)}</text></svg>;
}
