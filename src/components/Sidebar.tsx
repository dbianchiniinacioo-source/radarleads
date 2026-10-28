import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  Radar,
  KeyRound,
  ChevronDown,
  Eye,
  EyeOff,
  Globe,
  MessageCircle,
  Zap,
  LoaderCircle,
  BadgeCheck,
  ExternalLink,
  ShieldCheck,
  HandCoins,
  UtensilsCrossed,
  MapPinned,
  Building2,
  ListChecks,
  RotateCw,
  CircleAlert,
  Compass,
  Globe2,
  Mail,
  Share2,
  Hash,
  Gauge,
  Activity,
  RefreshCcw,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../utils/cn";
import type { EmailFilter, LeadSource, SiteFilter, SocialFilter, WaFilter } from "../lib/places";
import { UFS } from "../lib/ibge";
import { COUNTRIES, getCountry, WHOLE_COUNTRY, type CountryCode } from "../lib/countries";
import {
  DAILY_LIMIT,
  hoursUntilReset,
  remaining,
  totalCredits,
  type Usage,
} from "../lib/credits";

/* --------- mapeamento: categoria do app → categorias Geoapify --------- */
export const CATEGORY_MAP: Record<string, string> = {
  "Restaurante": "catering.restaurant",
  "Pizzaria": "catering.restaurant,catering.fast_food",
  "Lanchonete": "catering.fast_food,catering.cafe",
  "Hamburgueria": "catering.restaurant,catering.fast_food",
  "Churrascaria": "catering.restaurant",
  "Sushi": "catering.restaurant",
  "Bar": "catering.bar,catering.pub,catering.biergarten",
  "Cafeteria": "catering.cafe",
  "Sorveteria": "catering.ice_cream,catering.cafe",
  "Padaria": "commercial.food_and_drink.bakery,commercial.food_and_drink.convenience",
  "Confeitaria": "commercial.food_and_drink.confectionery,commercial.food_and_drink.pastry",
  "Farmácia": "commercial.chemist_and_pharmacy,healthcare.pharmacy",
  "Academia": "sport.fitness.complex,leisure.fitness_centre,entertainment.activity_park",
  "Salão de beleza": "service.hairdresser,service.beauty",
  "Barbearia": "service.hairdresser,service.beauty",
  "Estética": "service.beauty,service.spa",
  "Oficina mecânica": "service.vehicle.car_repair,service.vehicle",
  "Borracharia": "service.vehicle.tyres,commercial.automotive_parts",
  "Lava jato": "service.cleaning.car_wash,service.cleaning",
  "Autopeças": "commercial.automotive_parts,commercial",
  "Pet shop": "commercial.convenience_pet,service.dog_groomer",
  "Veterinário": "healthcare.veterinary",
  "Supermercado": "commercial.supermarket,commercial.grocery",
  "Mercearia": "commercial.food_and_drink.convenience,commercial.food_and_drink",
  "Açougue": "commercial.food_and_drink.butcher",
  "Hortifruti": "commercial.food_and_drink.greengrocer,commercial.marketplace",
  "Ótica": "commercial.optician,commercial",
  "Floricultura": "commercial.florist",
  "Joalheria": "commercial.jewelry",
  "Roupas": "commercial.clothing,commercial.boutique",
  "Calçados": "commercial.shoe,commercial.convenience_shoes",
  "Móveis": "commercial.furniture,commercial.decor",
  "Material de construção": "commercial.doityourself,commercial.trade,commercial.hardware",
  "Ferragens": "commercial.hardware,commercial.iron_and_metal",
  "Informática": "commercial.computer,commercial.electronics",
  "Celulares": "commercial.mobile_phone,commercial.electronics",
  "Imobiliária": "service.real_estate,service.estate_agent",
  "Dentista": "healthcare.dentist",
  "Clínica médica": "healthcare.clinic,healthcare.doctors,healthcare.hospital,healthcare",
  "Hotel/Pousada": "accommodation.hotel,accommodation.motel,accommodation.guest_house,accommodation.hostel",
  "Escola/Curso": "education.school,education.college,education",
  "Geral": "catering.restaurant,catering.cafe,catering.fast_food,commercial.supermarket,commercial.grocery,service.hairdresser,service.beauty,service.clothing_tailor,commercial.food_and_drink,commercial,service.vehicle,healthcare",
};

/* ------------------------- categorias fixas ------------------------- */
export const CATEGORIES = Object.keys(CATEGORY_MAP).filter((c) => c !== "Geral").concat("Geral");

export const TARGETS = [5, 10, 25, 50, 100] as const;

const SOURCES: {
  id: LeadSource;
  icon: LucideIcon;
  title: string;
  sub: string;
  activeCls: string;
  iconCls: string;
}[] = [
  {
    id: "osm",
    icon: HandCoins,
    title: "OpenStreetMap",
    sub: "100% grátis · sem cadastro nenhum",
    activeCls: "border-emerald-400/60 bg-emerald-400/[0.08]",
    iconCls: "text-emerald-300",
  },
  {
    id: "geoapify",
    icon: Compass,
    title: "Geoapify",
    sub: "grátis sem cartão · 3 mil/dia · serviço estável",
    activeCls: "border-teal-400/60 bg-teal-400/[0.08]",
    iconCls: "text-teal-300",
  },
  {
    id: "gmaps",
    icon: KeyRound,
    title: "Google Maps API",
    sub: "melhor base · crédito grátis (~10 mil/mês)",
    activeCls: "border-sky-400/60 bg-sky-400/[0.08]",
    iconCls: "text-sky-300",
  },
];

/* ------------------------------ props ------------------------------ */

export interface SidebarProps {
  source: LeadSource;
  onSource: (v: LeadSource) => void;
  searchLabel: string;
  apiKey: string;
  onApiKey: (v: string) => void;
  geoKey: string;
  onGeoKey: (v: string) => void;
  country: CountryCode;
  onCountry: (v: CountryCode) => void;
  regions: string[];
  category: string;
  onCategory: (v: string) => void;
  uf: string;
  onUf: (v: string) => void;
  city: string;
  onCity: (v: string) => void;
  cities: string[];
  citiesLoading: boolean;
  citiesError: string | null;
  onRetryCities: () => void;
  target: number;
  onTarget: (v: number) => void;
  usage: Usage;
  onResetUsage: () => void;
  onSyncUsage: (real: number) => void;
  /** leads entregues com esses créditos (p/ calcular custo médio) */
  delivered: number;
  /** créditos gastos na busca em andamento */
  liveCredits: number;
  siteFilter: SiteFilter;
  onSiteFilter: (v: SiteFilter) => void;
  waFilter: WaFilter;
  onWaFilter: (v: WaFilter) => void;
  emailFilter: EmailFilter;
  onEmailFilter: (v: EmailFilter) => void;
  socialFilter: SocialFilter;
  onSocialFilter: (v: SocialFilter) => void;
  searching: boolean;
  progress: { page: number; total: number } | null;
  onSearch: () => void;
}

/* --------------------------- subcomponentes --------------------------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-faint">
      {children}
    </p>
  );
}

function SegOption({
  active,
  onClick,
  children,
  tone = "accent",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "accent" | "gold" | "wa" | "mail" | "social";
}) {
  const tones = {
    accent: active
      ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300"
      : "border-transparent text-mute hover:text-emerald-100",
    gold: active
      ? "border-amber-400/60 bg-amber-400/15 text-amber-300"
      : "border-transparent text-mute hover:text-emerald-100",
    wa: active
      ? "border-[#25d366]/60 bg-[#25d366]/15 text-[#25d366]"
      : "border-transparent text-mute hover:text-emerald-100",
    mail: active
      ? "border-sky-400/60 bg-sky-400/15 text-sky-300"
      : "border-transparent text-mute hover:text-emerald-100",
    social: active
      ? "border-pink-400/60 bg-pink-400/15 text-pink-300"
      : "border-transparent text-mute hover:text-emerald-100",
  };
  return (
    <button type="button" onClick={onClick} className={cn("seg-btn border", tones[tone])}>
      {children}
    </button>
  );
}

function DarkSelect({
  icon: Icon,
  aria,
  value,
  onChange,
  disabled,
  loading,
  placeholder,
  options,
  highlight,
}: {
  icon: LucideIcon;
  aria: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder: string;
  options: { value: string; label: string }[];
  highlight?: boolean;
}) {
  const off = disabled || loading;
  return (
    <label className={cn("relative block", off && !loading && "opacity-60")}>
      <Icon size={15} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-faint" />
      <select
        aria-label={aria}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={off}
        className={cn(
          "input-dark appearance-none pl-10 pr-10",
          !value && "text-faint",
          off && "cursor-not-allowed",
          highlight && !value && "border-amber-400/40"
        )}
      >
        <option value="" disabled hidden>
          {loading ? "Carregando cidades…" : placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-panel text-emerald-50">
            {o.label}
          </option>
        ))}
      </select>
      {loading ? (
        <LoaderCircle size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-emerald-400" />
      ) : (
        <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-faint" />
      )}
    </label>
  );
}

/* ----------------------- painel de chave de API ----------------------- */

function KeyPanel({
  value,
  onChange,
  placeholder,
  guideTitle,
  steps,
  footer,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  guideTitle: string;
  steps: React.ReactNode;
  footer: string;
}) {
  const [showKey, setShowKey] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="animate-fade-up mt-1 flex flex-col gap-3 rounded-xl border border-line bg-ink-2/60 p-3.5">
      <label className="relative block">
        <KeyRound size={15} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-faint" />
        <input
          type={showKey ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          className="input-dark pl-10 pr-11 font-mono text-[12.5px]"
        />
        <button
          type="button"
          onClick={() => setShowKey((s) => !s)}
          className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-faint transition-colors hover:text-emerald-300"
          aria-label="Mostrar chave"
        >
          {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </label>

      <button
        type="button"
        onClick={() => setHelpOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[11.5px] font-medium text-mute transition-colors hover:text-emerald-300"
      >
        <ChevronDown size={13} className={cn("transition-transform", helpOpen && "rotate-180")} />
        {guideTitle}
      </button>

      {helpOpen && (
        <div className="animate-fade-up rounded-xl border border-line bg-ink/80 p-3 text-[11.5px] leading-relaxed text-mute">
          {steps}
        </div>
      )}

      <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-faint">
        <ShieldCheck size={12} className="mt-0.5 shrink-0 text-emerald-400/70" />
        {footer}
      </p>
    </div>
  );
}

/* ------------------------- combobox de cidade ------------------------- */

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function CityCombobox({
  value,
  onChange,
  disabled,
  loading,
  options,
  uf,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  loading?: boolean;
  options: string[];
  uf: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => setText(value), [value]);

  const filtered = useMemo(() => {
    const t = normalize(text.trim());
    if (!t || t === normalize(value || "")) return options;
    return options.filter((o) => normalize(o).includes(t));
  }, [text, options, value]);

  const shown = useMemo(() => filtered.slice(0, 80), [filtered]);

  /* fecha ao clicar fora e restaura o texto da cidade selecionada */
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setText(value);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [value]);

  useEffect(() => setActive(0), [text]);

  /* mantém o item ativo visível ao navegar com setas */
  useEffect(() => {
    if (!open) return;
    const li = listRef.current?.children[active] as HTMLElement | undefined;
    li?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const commit = (c: string) => {
    onChange(c);
    setText(c);
    setOpen(false);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = shown[Math.max(0, Math.min(active, shown.length - 1))];
      if (c) commit(c);
    } else if (e.key === "Escape") {
      setOpen(false);
      setText(value);
    }
  };

  const off = disabled || loading;

  return (
    <div ref={wrapRef} className={cn("relative", off && !loading && "opacity-60")}>
      <Building2
        size={15}
        className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-faint"
      />
      <input
        aria-label="Cidade"
        value={text}
        disabled={off}
        placeholder={loading ? "Carregando cidades…" : uf ? "Digite o nome da cidade…" : "Escolha o estado primeiro"}
        onFocus={() => !off && setOpen(true)}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKey}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          "input-dark appearance-none pl-10 pr-16",
          off && "cursor-not-allowed",
          uf && !value && !off && "border-amber-400/40"
        )}
      />
      {loading ? (
        <LoaderCircle size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-emerald-400" />
      ) : (
        <>
          {text && !off && (
            <button
              type="button"
              aria-label="Limpar cidade"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange("");
                setText("");
                setOpen(true);
              }}
              className="absolute right-8 top-1/2 z-10 -translate-y-1/2 text-faint transition-colors hover:text-emerald-200"
            >
              <X size={13} />
            </button>
          )}
          <ChevronDown
            size={15}
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-faint"
          />
        </>
      )}

      {open && !off && (
        <ul
          ref={listRef}
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-line-2 bg-panel-2 shadow-2xl shadow-black/60"
        >
          {shown.length === 0 && (
            <li className="px-3.5 py-3 text-[12px] text-faint">Nenhum município encontrado — confira a grafia.</li>
          )}
          {shown.map((c, i) => (
            <li key={c}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(c);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-[13px] transition-colors",
                  i === active ? "bg-emerald-400/15 text-emerald-100" : "text-mute hover:bg-line/40",
                  c === value && "font-bold text-emerald-300"
                )}
              >
                <span className="truncate">{c}</span>
                {c === value && <BadgeCheck size={13} className="shrink-0 text-emerald-300" />}
              </button>
            </li>
          ))}
          <li className="pointer-events-none sticky bottom-0 border-t border-line bg-panel-2/95 px-3.5 py-1.5 font-mono text-[9.5px] uppercase tracking-widest text-faint backdrop-blur">
            {filtered.length === options.length
              ? `${options.length} municípios de ${uf}`
              : `${filtered.length} de ${options.length} em ${uf}`}
          </li>
        </ul>
      )}
    </div>
  );
}

/* ------------------------------- sidebar ------------------------------- */

export default function Sidebar(p: SidebarProps) {
  const [logOpen, setLogOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncValue, setSyncValue] = useState("");
  const whole = p.uf === WHOLE_COUNTRY;
  const localOk = whole || (!!p.uf && !!p.city);
  const canSearch =
    !p.searching &&
    !!p.category &&
    localOk &&
    (p.source === "osm" ||
      (p.source === "gmaps" && p.apiKey.trim().length > 20) ||
      (p.source === "geoapify" && p.geoKey.trim().length > 15));

  return (
    <aside className="glass relative z-10 flex h-full w-full flex-col overflow-y-auto lg:w-[400px] lg:min-w-[400px] lg:rounded-3xl">
      {/* marca */}
      <div className="flex items-center gap-3 border-b border-line px-6 py-5">
        <div className="relative grid h-11 w-11 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10">
          <Radar size={22} className="text-emerald-300" />
          <span className="absolute inset-0 rounded-2xl bg-emerald-400/20 blur-md" />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold tracking-tight text-emerald-50">
            Radar<span className="text-emerald-400">Leads</span>
          </h1>
          <p className="text-[11px] leading-tight text-faint">Quem não tem site? Encontre de graça.</p>
        </div>
        {p.source === "osm" && (
          <span className="chip ml-auto border-emerald-400/40 bg-emerald-400/10 text-emerald-300">grátis</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-6 px-6 py-6">
        {/* ---------- fonte de dados ---------- */}
        <section className="flex flex-col gap-2.5">
          <SectionLabel>Fonte de dados</SectionLabel>
          {SOURCES.map((s) => {
            const active = p.source === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => p.onSource(s.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all",
                  active ? s.activeCls : "border-line bg-ink-2/60 hover:border-line-2"
                )}
              >
                <s.icon size={17} className={cn("shrink-0", active ? s.iconCls : "text-faint")} />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[13px] font-bold", active ? "text-emerald-50" : "text-mute")}>
                    {s.title}
                  </span>
                  <span className={cn("block text-[10.5px]", active ? s.iconCls : "text-faint")}>{s.sub}</span>
                </span>
                <span
                  className={cn(
                    "grid h-4.5 w-4.5 place-items-center rounded-full border transition-all",
                    active ? s.activeCls : "border-line-2"
                  )}
                >
                  {active && <BadgeCheck size={13} className={s.iconCls} />}
                </span>
              </button>
            );
          })}

          {p.source === "gmaps" && (
            <KeyPanel
              value={p.apiKey}
              onChange={p.onApiKey}
              placeholder="Cole sua API Key do Google Cloud…"
              guideTitle="Como conseguir uma chave?"
              footer="O Google dá crédito grátis mensal (≈10 mil buscas) — o cartão é só pra validar a conta e não é cobrado dentro do limite. A chave fica salva apenas no seu navegador."
              steps={
                <ol className="ml-4 list-decimal space-y-1.5">
                  <li>
                    Acesse{" "}
                    <a
                      className="text-emerald-300 underline decoration-emerald-300/40 underline-offset-2"
                      href="https://console.cloud.google.com"
                      target="_blank"
                      rel="noreferrer"
                    >
                      console.cloud.google.com
                    </a>{" "}
                    e crie um projeto.
                  </li>
                  <li>
                    Ative a <b className="text-emerald-200">Places API (New)</b> e o faturamento.
                  </li>
                  <li>
                    Em <b className="text-emerald-200">Credenciais</b>, crie uma Chave de API e cole aqui.
                  </li>
                </ol>
              }
            />
          )}

          {p.source === "geoapify" && (
            <KeyPanel
              value={p.geoKey}
              onChange={p.onGeoKey}
              placeholder="Cole sua Geoapify API Key…"
              guideTitle="Cadastro grátis em 1 min (não pede cartão)"
              footer="Plano grátis: 3.000 buscas/dia, com telefone e site de cada loja. A chave fica salva só no seu navegador."
              steps={
                <ol className="ml-4 list-decimal space-y-1.5">
                  <li>
                    Crie a conta grátis em{" "}
                    <a
                      className="text-teal-300 underline decoration-teal-300/40 underline-offset-2"
                      href="https://myprojects.geoapify.com"
                      target="_blank"
                      rel="noreferrer"
                    >
                      myprojects.geoapify.com
                    </a>{" "}
                    — <b className="text-emerald-200">sem cartão de crédito</b>.
                  </li>
                  <li>
                    Crie um projeto: a <b className="text-teal-200">API key</b> é gerada automaticamente.
                  </li>
                  <li>Cole a chave aqui e pronto — 3.000 buscas grátis por dia.</li>
                </ol>
              }
            />
          )}

          {p.source === "osm" && (
            <p className="animate-fade-up rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] px-3.5 py-2.5 text-[11px] leading-relaxed text-emerald-200/90">
              Dados reais do OpenStreetMap (© colaboradores, ODbL). Em horário de pico os servidores
              gratuitos limitam — por isso tentamos espelhos alternativos e área reduzida automaticamente.
            </p>
          )}
        </section>

        {/* ---------- busca ---------- */}
        <section className="flex flex-col gap-3">
          <SectionLabel>Estabelecimento</SectionLabel>
          <DarkSelect
            icon={UtensilsCrossed}
            aria="Categoria do estabelecimento"
            value={p.category}
            onChange={p.onCategory}
            placeholder="Categoria · ex.: Restaurante"
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          />

          <SectionLabel>Localização</SectionLabel>
          <DarkSelect
            icon={Globe2}
            aria="País"
            value={p.country}
            onChange={(v) => p.onCountry(v as CountryCode)}
            placeholder="País"
            options={COUNTRIES.map((c) => ({ value: c.code, label: `${c.flag}  ${c.name}` }))}
          />
          {!whole && (
            <DarkSelect
              icon={MapPinned}
              aria={getCountry(p.country).regionLabel}
              value={p.uf}
              onChange={p.onUf}
              placeholder={getCountry(p.country).regionLabel}
              options={
                p.country === "BR"
                  ? UFS.map((u) => ({ value: u.sigla, label: `${u.nome} — ${u.sigla}` }))
                  : p.regions.map((r) => ({ value: r, label: r }))
              }
              highlight
            />
          )}
          {/* busca nacional */}
          <button
            type="button"
            onClick={() => (p.uf === WHOLE_COUNTRY ? p.onUf("") : p.onUf(WHOLE_COUNTRY))}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition-all",
              p.uf === WHOLE_COUNTRY
                ? "border-emerald-400/60 bg-emerald-400/[0.1]"
                : "border-line bg-ink-2/60 hover:border-line-2"
            )}
          >
            <Globe2
              size={15}
              className={cn("shrink-0", p.uf === WHOLE_COUNTRY ? "text-emerald-300" : "text-faint")}
            />
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block text-[12.5px] font-bold",
                  p.uf === WHOLE_COUNTRY ? "text-emerald-100" : "text-mute"
                )}
              >
                Buscar no país inteiro
              </span>
              <span className="block text-[10px] text-faint">
                varre as maiores cidades até completar sua meta
              </span>
            </span>
            {p.uf === WHOLE_COUNTRY && <BadgeCheck size={15} className="shrink-0 text-emerald-300" />}
          </button>

          {p.uf !== WHOLE_COUNTRY && (
            <CityCombobox
              value={p.city}
              onChange={p.onCity}
              disabled={!p.uf || !!p.citiesError}
              loading={p.citiesLoading}
              options={p.cities}
              uf={p.uf}
            />
          )}
          {!whole && p.uf && !p.citiesLoading && !p.citiesError && p.cities.length > 0 && (
            <p className="-mt-1.5 text-[10px] text-faint">
              <b className="text-emerald-300/80">
                {p.cities.length} {p.country === "BR" ? "municípios" : "cidades"} de {p.uf}
              </b>{" "}
              — digite para filtrar
            </p>
          )}
          {p.citiesError && (
            <p className="animate-fade-up flex items-center gap-2 text-[11px] text-rose-300">
              <CircleAlert size={13} className="shrink-0" />
              {p.citiesError}
              <button
                type="button"
                onClick={p.onRetryCities}
                className="ml-auto inline-flex shrink-0 items-center gap-1 font-bold underline underline-offset-2 hover:text-rose-200"
              >
                <RotateCw size={11} /> tentar de novo
              </button>
            </p>
          )}

          <div className="mt-1">
            <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-mute">
              <ListChecks size={13} className="text-emerald-300/80" /> Quantidade de leads
              <span className="text-[10px] font-normal text-faint">(exata)</span>
            </p>
            <div className="flex gap-1 rounded-xl border border-line bg-ink-2/60 p-1">
              {TARGETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => p.onTarget(n)}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 font-mono text-[12px] font-bold transition-all",
                    p.target === n
                      ? "bg-emerald-400/20 text-emerald-300 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.4)]"
                      : "text-mute hover:text-emerald-100"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* quantidade personalizada */}
            <div className="mt-2 flex items-center gap-2">
              <label className="relative flex-1">
                <Hash size={14} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-faint" />
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={p.target}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (!Number.isNaN(n)) p.onTarget(Math.max(1, Math.min(500, n)));
                  }}
                  aria-label="Quantidade personalizada de leads"
                  className="input-dark py-2 pl-9 pr-3 font-mono text-[13px] font-bold"
                />
              </label>
              <span className="shrink-0 text-[10.5px] leading-tight text-faint">
                digite
                <br />1 a 500
              </span>
            </div>

            <p className="mt-1.5 text-[10px] leading-relaxed text-faint">
              Entregamos exatamente a quantia pedida — nem mais, nem menos. Metas altas exigem a opção{" "}
              <b className="text-emerald-300/80">país inteiro</b>.
            </p>
          </div>

          {/* ----------- consumo de créditos ----------- */}
          <div className="rounded-xl border border-line bg-ink-2/60 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-mute">
                <Gauge size={13} className="text-emerald-300/80" />
                {p.source === "geoapify" ? "Créditos Geoapify hoje" : "Consultas hoje"}
              </p>
              <button
                type="button"
                onClick={p.onResetUsage}
                title="Zerar contador local"
                className="text-faint transition-colors hover:text-emerald-300"
              >
                <RotateCw size={12} />
              </button>
            </div>

            {(() => {
              const limit = DAILY_LIMIT[p.source];
              const used = totalCredits(p.usage);
              const left = remaining(p.source, p.usage);
              const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
              const low = left !== null && limit !== null && left < limit * 0.15;
              const perLead = p.delivered > 0 ? used / p.delivered : 0;
              return (
                <>
                  <div className="mt-2 flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[18px] font-bold leading-none text-emerald-100">
                      {used.toLocaleString("pt-BR")}
                      {limit && (
                        <span className="text-[11px] font-medium text-faint">
                          {" "}
                          / {limit.toLocaleString("pt-BR")}
                        </span>
                      )}
                    </span>
                    {left !== null ? (
                      <span
                        className={cn(
                          "font-mono text-[11px] font-bold",
                          low ? "text-amber-300" : "text-emerald-300"
                        )}
                      >
                        restam {left.toLocaleString("pt-BR")}
                      </span>
                    ) : (
                      <span className="font-mono text-[10.5px] text-faint">sem limite</span>
                    )}
                  </div>

                  {limit && (
                    <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-line/70">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          low ? "bg-amber-400" : "bg-emerald-400"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}

                  {/* gasto da busca em andamento */}
                  {p.searching && p.liveCredits > 0 && (
                    <p className="animate-pulse-soft mt-2 flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 font-mono text-[10.5px] font-bold text-emerald-300">
                      <Activity size={11} />
                      esta busca: +{p.liveCredits} crédito{p.liveCredits === 1 ? "" : "s"}
                    </p>
                  )}

                  <p className="mt-1.5 text-[10px] leading-relaxed text-faint">
                    {p.usage.requests} chamada{p.usage.requests === 1 ? "" : "s"} ·{" "}
                    {p.usage.places.toLocaleString("pt-BR")} lugares analisados ·{" "}
                    {limit
                      ? `renova em ~${hoursUntilReset()}h`
                      : p.source === "osm"
                        ? "sem limite de conta"
                        : "limite conforme seu plano"}
                  </p>

                  {/* custo real por lead entregue */}
                  {used > 0 && p.delivered > 0 && (
                    <p className="mt-1.5 border-t border-line pt-1.5 text-[10px] leading-relaxed text-faint">
                      <b className="font-mono text-emerald-300/90">{perLead.toFixed(1)}</b> crédito
                      {perLead >= 2 ? "s" : ""} por lead · {p.delivered} entregue
                      {p.delivered === 1 ? "" : "s"}
                      {perLead > 3 && (
                        <span className="mt-0.5 block text-amber-300/80">
                          filtros estão caros — reduza para gastar menos
                        </span>
                      )}
                    </p>
                  )}

                  {/* detalhamento das últimas chamadas */}
                  {p.usage.log.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setLogOpen((o) => !o)}
                        className="mt-1.5 flex w-full items-center gap-1 border-t border-line pt-1.5 text-[10px] font-semibold text-mute transition-colors hover:text-emerald-300"
                      >
                        <ChevronDown size={11} className={cn("transition-transform", logOpen && "rotate-180")} />
                        {logOpen ? "ocultar" : "ver"} detalhamento das chamadas
                      </button>
                      {logOpen && (
                        <ul className="animate-fade-up mt-1.5 max-h-36 space-y-0.5 overflow-y-auto rounded-lg bg-ink/60 p-2 font-mono text-[9.5px]">
                          {p.usage.log.map((c, i) => (
                            <li key={i} className="flex items-center justify-between gap-2 text-faint">
                              <span className="truncate">
                                {new Date(c.at).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}{" "}
                                {c.label}
                              </span>
                              <span className="shrink-0">
                                <span className="text-mute">{c.places}p</span>{" "}
                                <b className="text-emerald-300/90">{c.credits}c</b>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}

                  {/* sincronizar com o painel real */}
                  {p.source === "geoapify" && (
                    <div className="mt-2 border-t border-line pt-2">
                      {syncOpen ? (
                        <div className="animate-fade-up flex flex-col gap-1.5">
                          <p className="text-[10px] leading-relaxed text-faint">
                            Veja o número real em{" "}
                            <a
                              href="https://myprojects.geoapify.com"
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 text-teal-300 underline underline-offset-2"
                            >
                              myprojects.geoapify.com <ExternalLink size={8} />
                            </a>{" "}
                            e cole aqui para calibrar:
                          </p>
                          <div className="flex gap-1.5">
                            <input
                              type="number"
                              min={0}
                              value={syncValue}
                              onChange={(e) => setSyncValue(e.target.value)}
                              placeholder="créditos reais"
                              className="input-dark flex-1 py-1.5 text-[11px]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const n = parseInt(syncValue, 10);
                                if (!Number.isNaN(n)) {
                                  p.onSyncUsage(n);
                                  setSyncOpen(false);
                                  setSyncValue("");
                                }
                              }}
                              className="rounded-lg bg-emerald-400/20 px-3 text-[11px] font-bold text-emerald-300 transition-colors hover:bg-emerald-400/30"
                            >
                              OK
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSyncOpen(true)}
                          className="flex w-full items-center gap-1 text-[10px] font-semibold text-mute transition-colors hover:text-emerald-300"
                        >
                          <RefreshCcw size={10} />
                          sincronizar com o painel Geoapify
                          {p.usage.syncedAt && (
                            <span className="ml-auto font-mono text-[9px] text-faint">
                              {p.usage.offset >= 0 ? "+" : ""}
                              {p.usage.offset} ajuste
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </section>

        {/* ---------- filtros ---------- */}
        <section className="flex flex-col gap-4">
          <SectionLabel>Filtros do resultado</SectionLabel>

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-mute">
              <Globe size={13} className="text-amber-300/80" /> Presença de site
            </p>
            <div className="flex rounded-xl border border-line bg-ink-2/60 p-1">
              <SegOption tone="gold" active={p.siteFilter === "sem"} onClick={() => p.onSiteFilter("sem")}>
                Sem site
              </SegOption>
              <SegOption active={p.siteFilter === "com"} onClick={() => p.onSiteFilter("com")}>
                Com site
              </SegOption>
              <SegOption active={p.siteFilter === "todos"} onClick={() => p.onSiteFilter("todos")}>
                Todos
              </SegOption>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-faint">
              Ter só Instagram/Facebook conta como <b className="text-amber-300/90">sem site próprio</b>.
            </p>
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-mute">
              <MessageCircle size={13} className="text-[#25d366]/90" /> WhatsApp
              <span className="text-[10px] font-normal text-faint">(estimado pelo nº do celular)</span>
            </p>
            <div className="flex rounded-xl border border-line bg-ink-2/60 p-1">
              <SegOption tone="wa" active={p.waFilter === "com"} onClick={() => p.onWaFilter("com")}>
                Com
              </SegOption>
              <SegOption active={p.waFilter === "sem"} onClick={() => p.onWaFilter("sem")}>
                Sem
              </SegOption>
              <SegOption active={p.waFilter === "todos"} onClick={() => p.onWaFilter("todos")}>
                Todos
              </SegOption>
            </div>
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-mute">
              <Mail size={13} className="text-sky-300/90" /> E-mail comercial
            </p>
            <div className="flex rounded-xl border border-line bg-ink-2/60 p-1">
              <SegOption tone="mail" active={p.emailFilter === "com"} onClick={() => p.onEmailFilter("com")}>
                Com
              </SegOption>
              <SegOption active={p.emailFilter === "sem"} onClick={() => p.onEmailFilter("sem")}>
                Sem
              </SegOption>
              <SegOption active={p.emailFilter === "todos"} onClick={() => p.onEmailFilter("todos")}>
                Todos
              </SegOption>
            </div>
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-mute">
              <Share2 size={13} className="text-pink-300/90" /> Redes sociais
              <span className="text-[10px] font-normal text-faint">(Instagram/Facebook)</span>
            </p>
            <div className="flex rounded-xl border border-line bg-ink-2/60 p-1">
              <SegOption tone="social" active={p.socialFilter === "com"} onClick={() => p.onSocialFilter("com")}>
                Com
              </SegOption>
              <SegOption active={p.socialFilter === "sem"} onClick={() => p.onSocialFilter("sem")}>
                Sem
              </SegOption>
              <SegOption active={p.socialFilter === "todos"} onClick={() => p.onSocialFilter("todos")}>
                Todos
              </SegOption>
            </div>
          </div>
        </section>

        {/* ---------- ação ---------- */}
        <button
          type="button"
          onClick={p.onSearch}
          disabled={!canSearch}
          className={cn(
            "group relative flex items-center justify-center gap-2.5 overflow-hidden rounded-2xl px-5 py-4 font-display text-[15px] font-bold tracking-wide transition-all",
            canSearch
              ? "bg-emerald-400 text-emerald-950 shadow-[0_0_36px_-6px_rgba(52,211,153,0.55)] hover:bg-emerald-300 active:scale-[0.98]"
              : "cursor-not-allowed bg-line/60 text-faint"
          )}
        >
          {p.searching ? (
            <>
              <LoaderCircle size={18} className="animate-spin" />
              {p.searchLabel}
              {p.progress ? ` · página ${p.progress.page}/${p.progress.total}` : "…"}
            </>
          ) : (
            <>
              <Zap size={18} className="transition-transform group-hover:-rotate-12" />
              Buscar {p.target} leads{p.source === "osm" ? " — grátis" : ""}
            </>
          )}
        </button>

        <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-faint">
          <HandCoins size={12} className="mt-0.5 shrink-0" />
          Fontes: OpenStreetMap (© colaboradores,{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-mute underline underline-offset-2 hover:text-emerald-300"
          >
            ODbL <ExternalLink size={9} />
          </a>
          ), Geoapify, Google Maps Platform e municípios do IBGE. WhatsApp é estimativa por celular BR.
        </p>
      </div>
    </aside>
  );
}
