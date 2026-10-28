import { memo } from "react";

function RadarBg() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {/* glow superior */}
      <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/[0.07] blur-[120px]" />
      <div className="absolute right-[-200px] top-[35%] h-[420px] w-[420px] rounded-full bg-teal-500/[0.05] blur-[110px]" />

      {/* grade */}
      <div className="grid-bg absolute inset-0" />

      {/* radar */}
      <div className="absolute left-1/2 top-[300px] aspect-square w-[1100px] max-w-[180vw] -translate-x-1/2 -translate-y-1/2 opacity-[0.5]">
        <div className="absolute inset-0 rounded-full border border-emerald-400/10" />
        <div className="absolute inset-[12%] rounded-full border border-emerald-400/10" />
        <div className="absolute inset-[25%] rounded-full border border-emerald-400/10" />
        <div className="absolute inset-[38%] rounded-full border border-emerald-400/[0.08]" />
        {/* eixos */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-emerald-400/[0.06]" />
        <div className="absolute left-0 top-1/2 h-px w-full bg-emerald-400/[0.06]" />
        {/* varredura */}
        <div className="sweep animate-radar-sweep absolute inset-0" />
        {/* blips */}
        {[
          { top: "30%", left: "62%", d: "0s" },
          { top: "58%", left: "38%", d: "1.1s" },
          { top: "42%", left: "70%", d: "1.8s" },
          { top: "65%", left: "60%", d: "0.6s" },
        ].map((b, i) => (
          <span key={i} className="absolute" style={{ top: b.top, left: b.left }}>
            <span
              className="animate-blip block h-3 w-3 rounded-full bg-emerald-400/60"
              style={{ animationDelay: b.d }}
            />
            <span className="absolute inset-0 m-auto h-1.5 w-1.5 rounded-full bg-emerald-300" />
          </span>
        ))}
      </div>

      {/* vinheta */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,#060809_90%)]" />
    </div>
  );
}

export default memo(RadarBg);
