export function Sparkline({ points, variant = "mrr", label }: { points: number[]; variant?: "mrr" | "cash"; label: string }) {
  if (points.length < 2) return <div className="empty" style={{ padding: "18px 0" }}><p>Not enough weeks yet.</p></div>;
  const width = 300;
  const height = 76;
  const pad = 4;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const x = (index: number) => pad + (index / (points.length - 1)) * (width - pad * 2);
  const y = (value: number) => height - pad - ((value - min) / span) * (height - pad * 2);
  const line = points.map((value, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${height - pad} L${x(0).toFixed(1)} ${height - pad} Z`;
  const zero = min < 0 && max > 0 ? y(0) : null;

  return <svg className="spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={label}>
    <path className={variant === "cash" ? "spark-cash-fill" : "spark-fill"} d={area}/>
    {zero !== null && <line className="spark-zero" x1={pad} x2={width - pad} y1={zero} y2={zero}/>}
    <path className={`spark-line ${variant === "cash" ? "spark-cash" : ""}`} d={line}/>
  </svg>;
}
