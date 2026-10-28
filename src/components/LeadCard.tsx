import { useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Star,
  Globe,
  GlobeLock,
  MessageCircle,
  Phone,
  ExternalLink,
  Send,
  Copy,
  Check,
  X,
  Target,
  AtSign,
  ThumbsUp,
  Mail,
} from "lucide-react";
import { cn } from "../utils/cn";
import type { Lead } from "../lib/places";

/* ------------------------------ badges ------------------------------ */

function WaBadge({ lead }: { lead: Lead }) {
  if (lead.whatsapp === "provavel")
    return (
      <span className="chip border-[#25d366]/40 bg-[#25d366]/10 text-[#25d366]">
        <MessageCircle size={11} /> WhatsApp provável
      </span>
    );
  if (lead.whatsapp === "fixo")
    return (
      <span className="chip border-line-2 bg-panel-2/70 text-mute">
        <Phone size={11} /> fixo
      </span>
    );
  return (
    <span className="chip border-line bg-panel-2/50 text-faint">
      <Phone size={11} /> sem telefone
    </span>
  );
}

/* ------------------------------ card ------------------------------ */

export function LeadCard({
  lead,
  index,
  onCompose,
}: {
  lead: Lead;
  index: number;
  onCompose: (lead: Lead) => void;
}) {
  const semSite = !lead.hasSite;
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.045, 0.6), duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border p-4 transition-colors duration-300",
        semSite
          ? "border-amber-400/25 bg-gradient-to-b from-amber-400/[0.06] to-panel hover:border-amber-400/50"
          : "border-line bg-panel/80 hover:border-line-2"
      )}
    >
      {semSite && (
        <span className="absolute -top-2.5 right-4 chip border-amber-400/50 bg-ink px-2 text-amber-300 shadow-[0_0_18px_-2px_rgba(251,191,36,0.4)]">
          <Target size={11} /> oportunidade
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display truncate text-[15.5px] font-bold leading-snug text-emerald-50" title={lead.name}>
            {lead.name}
          </h3>
          {lead.primaryType && (
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-faint">{lead.primaryType}</p>
          )}
        </div>
        {lead.rating !== undefined && (
          <span className="flex shrink-0 items-center gap-1 rounded-lg border border-line bg-ink-2/70 px-2 py-1 font-mono text-[11.5px] font-semibold text-amber-200">
            <Star size={12} className="fill-amber-300 text-amber-300" />
            {lead.rating.toFixed(1)}
            <span className="font-normal text-faint">({lead.ratingCount ?? 0})</span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {semSite ? (
          <span className="chip border-amber-400/40 bg-amber-400/10 text-amber-300">
            <GlobeLock size={11} /> sem site
          </span>
        ) : (
          <a
            href={lead.website}
            target="_blank"
            rel="noreferrer"
            className="chip max-w-full border-line-2 bg-panel-2/70 text-mute transition-colors hover:border-emerald-400/40 hover:text-emerald-200"
          >
            <Globe size={11} className="shrink-0" />
            <span className="truncate">{lead.website?.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
          </a>
        )}
        <WaBadge lead={lead} />
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            className="chip max-w-full border-sky-400/40 bg-sky-400/10 text-sky-300 transition-colors hover:bg-sky-400/20"
            title={lead.email}
          >
            <Mail size={11} className="shrink-0" />
            <span className="truncate">{lead.email}</span>
          </a>
        )}
        {lead.instagramUrl && (
          <a
            href={lead.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="chip border-pink-400/40 bg-pink-400/10 text-pink-300 transition-colors hover:bg-pink-400/20"
          >
            <AtSign size={11} /> Instagram
          </a>
        )}
        {lead.facebookUrl && (
          <a
            href={lead.facebookUrl}
            target="_blank"
            rel="noreferrer"
            className="chip border-blue-400/40 bg-blue-400/10 text-blue-300 transition-colors hover:bg-blue-400/20"
          >
            <ThumbsUp size={11} /> Facebook
          </a>
        )}
      </div>

      {(lead.address || lead.phoneNational) && (
        <div className="flex flex-col gap-1 text-[12px] leading-relaxed text-mute">
          {lead.address && (
            <p className="flex items-start gap-1.5">
              <MapPin size={12.5} className="mt-[3px] shrink-0 text-faint" />
              <span className="line-clamp-2">{lead.address}</span>
            </p>
          )}
          {lead.phoneNational && (
            <p className="flex items-center gap-1.5 font-mono text-[11.5px]">
              <Phone size={12} className="shrink-0 text-faint" /> {lead.phoneNational}
            </p>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 pt-1">
        {lead.mapsUrl && (
          <a
            href={lead.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-line bg-ink-2/70 px-2.5 py-1.5 text-[11.5px] font-semibold text-mute transition-all hover:border-line-2 hover:text-emerald-100"
          >
            <ExternalLink size={12} /> Maps
          </a>
        )}
        {lead.waLink && (
          <a
            href={lead.waLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-[#25d366]/30 bg-[#25d366]/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-[#25d366] transition-all hover:bg-[#25d366]/20"
          >
            <MessageCircle size={12} /> WhatsApp
          </a>
        )}
        {lead.whatsapp !== "sem-telefone" && (
          <button
            type="button"
            onClick={() => onCompose(lead)}
            className={cn(
              "ml-auto flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold transition-all",
              semSite
                ? "border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20"
                : "border-line bg-ink-2/70 text-mute hover:border-line-2 hover:text-emerald-100"
            )}
          >
            <Send size={12} /> Abordar
          </button>
        )}
      </div>
    </motion.article>
  );
}

/* ------------------------------ compositor ------------------------------ */

const rep = (s: string, token: string, value: string) => s.split(token).join(value);

export function applyTemplate(template: string, lead: Lead, city?: string) {
  let out = rep(template, "{empresa}", lead.name);
  out = rep(out, "{categoria}", (lead.primaryType || "empresas").toLowerCase());
  out = rep(out, "{cidade}", city || "sua região");
  out = rep(out, "{telefone}", lead.phoneNational || lead.phoneIntl || "");
  return out;
}

export function MessageComposer({
  lead,
  template,
  onTemplate,
  city,
  onClose,
}: {
  lead: Lead;
  template: string;
  onTemplate: (v: string) => void;
  city: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const text = applyTemplate(template, lead, city);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard bloqueado */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="glass noise relative w-full max-w-lg overflow-hidden rounded-3xl p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-400/80">
              Mensagem de prospecção
            </p>
            <h3 className="font-display mt-1 text-lg font-bold leading-tight text-emerald-50">{lead.name}</h3>
            <p className="mt-0.5 font-mono text-[11.5px] text-mute">{lead.phoneNational || "telefone não informado"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line p-1.5 text-mute transition-colors hover:border-line-2 hover:text-emerald-100"
            aria-label="Fechar"
          >
            <X size={15} />
          </button>
        </div>

        <textarea
          value={template}
          onChange={(e) => onTemplate(e.target.value)}
          rows={6}
          className="input-dark resize-none font-body text-[13px] leading-relaxed"
        />
        <p className="mt-1.5 text-[10.5px] text-faint">
          Variáveis disponíveis: {"{empresa}"} {"{categoria}"} {"{cidade}"} {"{telefone}"}
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={copy}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-bold transition-all",
              copied
                ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300"
                : "border-line bg-ink-2/80 text-emerald-100 hover:border-line-2"
            )}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copiada!" : "Copiar mensagem"}
          </button>
          {lead.waLink ? (
            <a
              href={`${lead.waLink}?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25d366] px-4 py-2.5 text-[13px] font-bold text-emerald-950 transition-all hover:bg-[#2be273] active:scale-[0.98]"
            >
              <MessageCircle size={15} /> Abrir no WhatsApp
            </a>
          ) : (
            <span className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 text-[13px] font-semibold text-faint">
              <MessageCircle size={15} /> Nº fixo — copie e ligue
            </span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
