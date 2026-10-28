import { useEffect, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import { Radar, GlobeLock, MessageCircle, Target } from "lucide-react";
import { cn } from "../utils/cn";

function Counter({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, mv]);

  return <span className="font-mono tabular-nums">{display}</span>;
}

export interface StatsBarProps {
  total: number;
  semSite: number;
  comWhatsapp: number;
  exibindo: number;
  alvo: number;
}

export default function StatsBar({ total, semSite, comWhatsapp, exibindo, alvo }: StatsBarProps) {
  const pctSemSite = total > 0 ? Math.round((semSite / total) * 100) : 0;
  const pctWa = total > 0 ? Math.round((comWhatsapp / total) * 100) : 0;
  const pctMeta = alvo > 0 ? Math.min(100, Math.round((exibindo / alvo) * 100)) : 0;

  const cards = [
    {
      icon: Radar,
      label: "encontradas",
      value: total,
      tone: "text-emerald-300",
      border: "border-emerald-400/25",
      bar: null as null | number,
      barColor: "",
    },
    {
      icon: GlobeLock,
      label: "sem site",
      value: semSite,
      tone: "text-amber-300",
      border: "border-amber-400/25",
      bar: pctSemSite,
      barColor: "bg-amber-400",
    },
    {
      icon: MessageCircle,
      label: "c/ WhatsApp aparente",
      value: comWhatsapp,
      tone: "text-[#25d366]",
      border: "border-[#25d366]/25",
      bar: pctWa,
      barColor: "bg-[#25d366]",
    },
    {
      icon: Target,
      label: `entregues · meta ${alvo}`,
      value: exibindo,
      tone: pctMeta >= 100 ? "text-emerald-300" : "text-emerald-100",
      border: pctMeta >= 100 ? "border-emerald-400/40" : "border-line-2",
      bar: pctMeta,
      barColor: "bg-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className={cn("glass rounded-2xl border px-4 py-3.5", c.border)}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-faint">{c.label}</p>
            <c.icon size={14} className={cn(c.tone, "opacity-80")} />
          </div>
          <p className={cn("font-display mt-1 text-2xl font-bold leading-none", c.tone)}>
            <Counter value={c.value} />
            {c.bar !== null && <span className="ml-1.5 align-middle font-mono text-[11px] font-medium text-faint">{c.bar}%</span>}
          </p>
          {c.bar !== null && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-line/70">
              <motion.div
                className={cn("h-full rounded-full", c.barColor)}
                initial={{ width: 0 }}
                animate={{ width: `${c.bar}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
