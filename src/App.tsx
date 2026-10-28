import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Download,
  Map as MapIcon,
  ScanSearch,
  GlobeLock,
  CircleAlert,
  MapPinned,
  ListChecks,
  FileSpreadsheet,
  ListX,
  RefreshCw,
  HandCoins,
  KeyRound,
  History,
  Gauge,
} from "lucide-react";
import RadarBg from "./components/RadarBg";
import Sidebar, { CATEGORIES } from "./components/Sidebar";
import StatsBar from "./components/StatsBar";
import { LeadCard, MessageComposer } from "./components/LeadCard";
import { cn } from "./utils/cn";
import {
  PlacesError,
  downloadCsv,
  filterLeads,
  searchPlaces,
  type EmailFilter,
  type Lead,
  type LeadSource,
  type SiteFilter,
  type SocialFilter,
  type WaFilter,
} from "./lib/places";
import { searchOSM } from "./lib/osm";
import { searchGeoapify } from "./lib/geoapify";
import { fetchCities, ufNome } from "./lib/ibge";
import {
  addDelivered,
  readUsage,
  resetUsage,
  syncWithDashboard,
  totalCredits,
  type Usage,
} from "./lib/credits";
import {
  getCities,
  getCountry,
  getRegions,
  MAJOR_CITIES,
  WHOLE_COUNTRY,
  type CountryCode,
} from "./lib/countries";

const DEFAULT_TEMPLATE =
  "Olá! Vi o perfil da {empresa} no mapa e notei que vocês ainda não têm um site próprio. Eu crio sites profissionais para {categoria} em {cidade} — com botão de WhatsApp, presença no Google e visual moderno. Posso te enviar uma proposta gratuita com exemplos?";

const SEARCH_LABEL: Record<LeadSource, string> = {
  osm: "Consultando OpenStreetMap",
  gmaps: "Consultando Google Maps",
  geoapify: "Consultando Geoapify",
};

const VALID_SOURCES: LeadSource[] = ["osm", "gmaps", "geoapify"];

type Status = "idle" | "searching" | "done" | "error";

const lsGet = (k: string, d = "") => {
  try {
    return localStorage.getItem(k) ?? d;
  } catch {
    return d;
  }
};
const lsSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export default function App() {
  const [source, setSource] = useState<LeadSource>(() => {
    const v = lsGet("rl_source", "osm");
    return (VALID_SOURCES as string[]).includes(v) ? (v as LeadSource) : "osm";
  });
  const [apiKey, setApiKey] = useState(() => lsGet("rl_key"));
  const [geoKey, setGeoKey] = useState(() => lsGet("rl_geoapify_key"));

  const [country, setCountry] = useState<CountryCode>(() => {
    const v = lsGet("rl_country", "BR");
    return ["BR", "US", "GB", "PT", "IT"].includes(v) ? (v as CountryCode) : "BR";
  });
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [uf, setUf] = useState("");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [target, setTarget] = useState<number>(10);

  const [siteFilter, setSiteFilter] = useState<SiteFilter>("sem");
  const [waFilter, setWaFilter] = useState<WaFilter>("todos");
  const [emailFilter, setEmailFilter] = useState<EmailFilter>("todos");
  const [socialFilter, setSocialFilter] = useState<SocialFilter>("todos");

  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<{ page: number; total: number } | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<PlacesError | null>(null);
  const [rawLeads, setRawLeads] = useState<Lead[]>([]);

  const [usage, setUsage] = useState<Usage>(() => readUsage("osm"));
  const [liveCredits, setLiveCredits] = useState(0);
  const creditsAtStart = useRef(0);
  const [compose, setCompose] = useState<Lead | null>(null);
  const [template, setTemplate] = useState(() => lsGet("rl_template", DEFAULT_TEMPLATE));
  const [mapOpen, setMapOpen] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<{ at: number; stale: boolean } | null>(null);
  const [exhausted, setExhausted] = useState<{ found: number; wanted: number; cities: number } | null>(null);

  const citiesReq = useRef(0);

  /* mantém o painel de créditos sincronizado com a fonte escolhida */
  useEffect(() => {
    setUsage(readUsage(source));
  }, [source]);

  /* regiões (estados/distritos) do país selecionado */
  const regions = useMemo(() => (country === "BR" ? [] : getRegions(country)), [country]);

  /* ao trocar de país, zera região e cidade */
  useEffect(() => {
    lsSet("rl_country", country);
    setUf("");
    setCity("");
    setCities([]);
    setCitiesError(null);
  }, [country]);

  /* --------- carrega cidades ao trocar de região --------- */
  useEffect(() => {
    setCity("");
    setCities([]);
    setCitiesError(null);
    if (!uf || uf === WHOLE_COUNTRY) return;

    /* países estáticos: lista local, instantânea */
    if (country !== "BR") {
      setCities(getCities(country, uf));
      return;
    }

    /* Brasil: API do IBGE com todos os municípios */
    const id = ++citiesReq.current;
    setCitiesLoading(true);
    fetchCities(uf)
      .then((arr) => {
        if (citiesReq.current === id) setCities(arr);
      })
      .catch(() => {
        if (citiesReq.current === id) setCitiesError("Não foi possível carregar os municípios (IBGE).");
      })
      .finally(() => {
        if (citiesReq.current === id) setCitiesLoading(false);
      });
  }, [uf, country, retryTick]);

  /* exatamente a quantidade pedida — nem mais, nem menos */
  const filtered = useMemo(
    () => filterLeads(rawLeads, siteFilter, waFilter, emailFilter, socialFilter).slice(0, target),
    [rawLeads, siteFilter, waFilter, emailFilter, socialFilter, target]
  );
  const stats = useMemo(
    () => ({
      total: rawLeads.length,
      semSite: rawLeads.filter((l) => !l.hasSite).length,
      comWhatsapp: rawLeads.filter((l) => l.whatsapp === "provavel").length,
      exibindo: filtered.length,
      alvo: target,
    }),
    [rawLeads, filtered, target]
  );

  const handleSource = (v: LeadSource) => {
    setSource(v);
    lsSet("rl_source", v);
  };
  const handleApiKey = (v: string) => {
    setApiKey(v);
    lsSet("rl_key", v);
  };
  const handleGeoKey = (v: string) => {
    setGeoKey(v);
    lsSet("rl_geoapify_key", v);
  };
  const handleTemplate = (v: string) => {
    setTemplate(v);
    lsSet("rl_template", v);
  };

  const wholeCountry = uf === WHOLE_COUNTRY;
  const displayCity = wholeCountry
    ? `${getCountry(country).name} (país inteiro)`
    : uf
      ? `${city} · ${uf}`
      : city;
  const cityQuery = !uf ? city : country === "BR" ? `${city}, ${ufNome(uf)}` : `${city}, ${uf}`;

  /* exigências repassadas para a API filtrar na origem */
  const requirements = useMemo(
    () => ({
      email: emailFilter,
      site: siteFilter,
      social: socialFilter,
      phone: waFilter,
    }),
    [emailFilter, siteFilter, socialFilter, waFilter]
  );

  /* ---------- cache local de resultados ---------- */
  const FRESH_MS = 2 * 3600_000;
  const cacheKey = `${source}_${slug(category)}_${slug(displayCity)}`;
  const readCache = (): { t: number; leads: Lead[] } | null => {
    try {
      const raw = localStorage.getItem(`rl_cache_${cacheKey}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.leads) ? parsed : null;
    } catch {
      return null;
    }
  };
  const writeCache = (leads: Lead[]) => {
    try {
      localStorage.setItem(`rl_cache_${cacheKey}`, JSON.stringify({ t: Date.now(), leads }));
    } catch {
      /* storage cheio */
    }
  };

  const runSearch = async () => {
    setError(null);
    setMapOpen(false);

    /* cache fresco (<2h): resposta instantânea, sem tocar no servidor */
    const cached = readCache();
    if (cached && Date.now() - cached.t < FRESH_MS) {
      setRawLeads(cached.leads);
      setCacheInfo({ at: cached.t, stale: false });
      setStatus("done");
      return;
    }

    setStatus("searching");
    setRawLeads([]);
    setCacheInfo(null);
    setExhausted(null);
    setPhase(null);
    creditsAtStart.current = totalCredits(readUsage(source));
    setLiveCredits(0);
    setProgress(source === "osm" ? null : { page: 0, total: 3 });

    try {
      /* busca em UMA localidade */
      const searchOne = async (place: string): Promise<Lead[]> => {
        if (source === "osm") {
          return searchOSM({ query: category, city: place, country, requirements, onPhase: setPhase });
        }
        if (source === "geoapify") {
          return searchGeoapify(geoKey.trim(), {
            query: category,
            city: place,
            country,
            requirements,
            target,
            onPhase: setPhase,
          });
        }
        return searchPlaces(apiKey.trim(), {
          query: category,
          city: place,
          maxPages: 3,
          onProgress: (page, total) => setProgress({ page, total }),
        });
      };

      /* quantos já servem de verdade (depois dos filtros) */
      const countValid = (arr: Lead[]) =>
        filterLeads(arr, siteFilter, waFilter, emailFilter, socialFilter).length;

      let leads: Lead[] = [];

      if (wholeCountry) {
        /* varre as cidades-polo até bater a meta — para assim que atingir.
           Se 3 cidades seguidas não acrescentarem nada novo, a fonte
           esgotou: paramos para não queimar crédito à toa. */
        const cities = MAJOR_CITIES[country];
        const vistos = new Set<string>();
        let secas = 0; // cidades consecutivas sem lead novo
        let esgotado = false;

        for (let i = 0; i < cities.length; i++) {
          const antes = countValid(leads);
          setPhase(`Varrendo ${cities[i].split(",")[0]} (${i + 1}/${cities.length})…`);
          setProgress({ page: antes, total: target });
          try {
            const parcial = await searchOne(cities[i]);
            for (const l of parcial) {
              if (vistos.has(l.id)) continue;
              vistos.add(l.id);
              leads.push(l);
            }
          } catch {
            /* uma cidade falhou — segue para a próxima */
          }
          /* atualiza o gasto desta busca em tempo real */
          const agora = readUsage(source);
          setUsage(agora);
          setLiveCredits(Math.max(0, totalCredits(agora) - creditsAtStart.current));

          if (countValid(leads) >= target) break;

          /* nada novo? conta como "seca" */
          if (countValid(leads) === antes) {
            secas += 1;
            if (secas >= 3) {
              esgotado = true;
              break;
            }
          } else {
            secas = 0; // avançou — reinicia a contagem
          }
        }

        if (leads.length === 0) {
          throw new PlacesError(
            "Nenhuma cidade respondeu.",
            "Os servidores podem estar congestionados. Tente de novo em 1 minuto."
          );
        }

        /* avisa quando a fonte esgotou antes da meta */
        if (esgotado && countValid(leads) < target) {
          setExhausted({
            found: countValid(leads),
            wanted: target,
            cities: cities.length,
          });
        }
      } else {
        leads = await searchOne(cityQuery);
      }

      setRawLeads(leads);
      writeCache(leads);
      setCacheInfo({ at: Date.now(), stale: false });
      /* registra quantos leads foram entregues de verdade */
      setUsage(addDelivered(source, filterLeads(leads, siteFilter, waFilter, emailFilter, socialFilter).length));
      setStatus("done");
    } catch (e) {
      /* modo sobrevivência: se já existe resultado salvo, mostra ele */
      const stash = readCache();
      if (stash && stash.leads.length > 0) {
        setRawLeads(stash.leads);
        setCacheInfo({ at: stash.t, stale: true });
        setStatus("done");
      } else {
        setError(
          e instanceof PlacesError
            ? e
            : new PlacesError("Erro inesperado ao buscar.", String(e instanceof Error ? e.message : e))
        );
        setStatus("error");
      }
    } finally {
      setProgress(null);
      setPhase(null);
      const fim = readUsage(source);
      setUsage(fim);
      setLiveCredits(Math.max(0, totalCredits(fim) - creditsAtStart.current));
    }
  };

  const exportCsv = () => {
    const nome = `radarleads_${slug(category) || "busca"}_${slug(city)}-${uf.toLowerCase()}_${siteFilter === "sem" ? "SEM-SITE" : siteFilter === "com" ? "COM-SITE" : "todos"}-${target}leads.csv`;
    downloadCsv(filtered, nome);
  };

  const filterLabel = [
    siteFilter === "sem" ? "sem site" : siteFilter === "com" ? "com site" : "com ou sem site",
    waFilter === "com" ? "com WhatsApp" : waFilter === "sem" ? "sem WhatsApp" : null,
    emailFilter === "com" ? "com e-mail" : emailFilter === "sem" ? "sem e-mail" : null,
    socialFilter === "com" ? "com redes sociais" : socialFilter === "sem" ? "sem redes sociais" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const sourceChip =
    source === "osm"
      ? { cls: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300", label: "OpenStreetMap · grátis" }
      : source === "geoapify"
        ? { cls: "border-teal-400/40 bg-teal-400/10 text-teal-300", label: "Geoapify · grátis" }
        : { cls: "border-sky-400/40 bg-sky-400/10 text-sky-300", label: "Google Maps" };

  const shortfall = status === "done" && rawLeads.length > 0 && filtered.length < target;

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink">
      <RadarBg />

      <div className="relative z-10 flex min-h-screen flex-col gap-3 p-3 lg:h-screen lg:flex-row lg:overflow-hidden">
        <Sidebar
          source={source}
          onSource={handleSource}
          searchLabel={SEARCH_LABEL[source]}
          apiKey={apiKey}
          onApiKey={handleApiKey}
          geoKey={geoKey}
          onGeoKey={handleGeoKey}
          country={country}
          onCountry={setCountry}
          regions={regions}
          category={category}
          onCategory={setCategory}
          uf={uf}
          onUf={setUf}
          city={city}
          onCity={setCity}
          cities={cities}
          citiesLoading={citiesLoading}
          citiesError={citiesError}
          onRetryCities={() => setRetryTick((t) => t + 1)}
          target={target}
          onTarget={setTarget}
          usage={usage}
          onResetUsage={() => setUsage(resetUsage(source))}
          onSyncUsage={(real) => setUsage(syncWithDashboard(source, real))}
          delivered={usage.delivered}
          liveCredits={liveCredits}
          siteFilter={siteFilter}
          onSiteFilter={setSiteFilter}
          waFilter={waFilter}
          onWaFilter={setWaFilter}
          emailFilter={emailFilter}
          onEmailFilter={setEmailFilter}
          socialFilter={socialFilter}
          onSocialFilter={setSocialFilter}
          searching={status === "searching"}
          progress={progress}
          onSearch={runSearch}
        />

        {/* ================= PAINEL PRINCIPAL ================= */}
        <main className="glass noise relative flex min-h-[70vh] flex-1 flex-col overflow-hidden rounded-3xl">
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            {/* ---------- ESTADO: vazio ---------- */}
            {status === "idle" && (
              <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center py-10 text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="relative mb-8 grid h-28 w-28 place-items-center"
                >
                  <span className="absolute inset-0 rounded-full border border-emerald-400/25" />
                  <span className="absolute inset-[18%] rounded-full border border-emerald-400/20" />
                  <span className="sweep animate-radar-sweep absolute inset-0" />
                  <ScanSearch size={34} className="relative text-emerald-300" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="font-display text-3xl font-bold leading-[1.08] tracking-tight text-emerald-50 sm:text-[42px]"
                >
                  Descubra negócios de qualquer cidade do Brasil{" "}
                  <span className="text-glow-gold bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
                    que ainda não têm site
                  </span>
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-4 max-w-lg text-[14.5px] leading-relaxed text-mute"
                >
                  Escolha o <b className="text-emerald-200">estado e a cidade</b>, a categoria e a{" "}
                  <b className="text-emerald-200">quantidade exata</b> de leads — filtre por{" "}
                  <b className="text-emerald-200">com ou sem WhatsApp</b> e{" "}
                  <b className="text-emerald-200">com ou sem site</b>.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-6 flex items-center gap-2.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2"
                >
                  <HandCoins size={15} className="text-emerald-300" />
                  <span className="text-[12.5px] font-semibold text-emerald-200">
                    Grátis: OpenStreetMap sem cadastro, ou Geoapify sem cartão (3 mil/dia)
                  </span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.38, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-10 grid w-full gap-2.5 text-left sm:grid-cols-3"
                >
                  {[
                    {
                      icon: MapPinned,
                      n: "01",
                      t: "Estado e cidade",
                      d: "todos os 27 estados e 5.570 municípios do IBGE",
                    },
                    {
                      icon: ListChecks,
                      n: "02",
                      t: "Categoria e meta",
                      d: "restaurantes, farmácias, academias… e quantos leads você quer",
                    },
                    {
                      icon: FileSpreadsheet,
                      n: "03",
                      t: "Filtre e exporte",
                      d: "sem site, com/sem WhatsApp — baixe o CSV e aborde",
                    },
                  ].map((s) => (
                    <div key={s.n} className="rounded-2xl border border-line bg-ink-2/70 p-4">
                      <div className="flex items-center justify-between">
                        <s.icon size={17} className="text-emerald-300" />
                        <span className="font-mono text-[10px] font-bold tracking-widest text-faint">{s.n}</span>
                      </div>
                      <p className="font-display mt-3 text-[15px] font-bold text-emerald-50">{s.t}</p>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-faint">{s.d}</p>
                    </div>
                  ))}
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="mt-8 flex items-center gap-2 text-[11.5px] text-faint"
                >
                  <KeyRound size={13} className="text-sky-300/80" />
                  Tem uma chave do Google Maps API? Troque a fonte na lateral.
                </motion.p>
              </div>
            )}

            {/* ---------- ESTADO: buscando ---------- */}
            {status === "searching" && (
              <div className="mx-auto flex h-full max-w-4xl flex-col py-6">
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
                  </span>
                  <div>
                    <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                      {SEARCH_LABEL[source]}
                      {progress ? ` · página ${progress.page}/${progress.total}` : ""}
                    </p>
                    {source === "osm" ? (
                      <p className="mt-0.5 text-[11px] text-faint">
                        {phase || "Preparando…"} · servidores gratuitos podem levar até ~40s
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[11px] text-faint">buscando amplamente para bater a meta de {target} leads</p>
                    )}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-fade-up rounded-2xl border border-line bg-panel/70 p-4"
                      style={{ animationDelay: `${i * 0.06}s` }}
                    >
                      <div className="animate-pulse-soft space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="h-4 w-3/5 rounded-md bg-line/80" />
                          <div className="h-5 w-12 rounded-lg bg-line/80" />
                        </div>
                        <div className="h-3 w-2/5 rounded bg-line/60" />
                        <div className="flex gap-2">
                          <div className="h-5 w-20 rounded-full bg-line/60" />
                          <div className="h-5 w-24 rounded-full bg-line/60" />
                        </div>
                        <div className="h-3 w-4/5 rounded bg-line/50" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---------- ESTADO: erro ---------- */}
            {status === "error" && error && (
              <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center py-10 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full rounded-3xl border border-rose-400/30 bg-rose-400/[0.06] p-7"
                >
                  <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-rose-400/40 bg-rose-400/10">
                    <CircleAlert size={22} className="text-rose-300" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-rose-100">{error.message}</h3>
                  {error.hint && <p className="mt-2 text-[13px] leading-relaxed text-mute">{error.hint}</p>}
                  <button
                    type="button"
                    onClick={runSearch}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-400/10 px-4 py-2 text-[13px] font-bold text-rose-200 transition-all hover:bg-rose-400/20"
                  >
                    <RefreshCw size={14} /> Tentar novamente
                  </button>
                </motion.div>
              </div>
            )}

            {/* ---------- ESTADO: resultados ---------- */}
            {status === "done" && (
              <div className="flex flex-col gap-5">
                {/* cabeçalho do resultado */}
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-400/80">
                      Resultado da varredura
                    </p>
                    <h2 className="font-display mt-1 text-2xl font-bold leading-tight tracking-tight text-emerald-50 sm:text-[28px]">
                      {category}
                      {displayCity && <span className="text-faint"> · {displayCity}</span>}
                    </h2>
                    <p className="mt-1 text-[12.5px] text-mute">
                      Entregando <b className="text-emerald-200">{filtered.length}</b> de{" "}
                      <b className="text-emerald-200">{target}</b> leads pedidos{" "}
                      <span className="text-faint">({filterLabel})</span>
                      <span className={cn("chip ml-2 align-middle", sourceChip.cls)}>{sourceChip.label}</span>
                      {liveCredits > 0 && source !== "osm" && (
                        <span className="chip ml-2 border-teal-400/40 bg-teal-400/10 align-middle text-teal-300">
                          <Gauge size={10} /> {liveCredits} crédito{liveCredits === 1 ? "" : "s"}
                        </span>
                      )}
                      {cacheInfo && (
                        <span
                          className={cn(
                            "chip ml-2 align-middle",
                            cacheInfo.stale
                              ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                              : "border-line-2 bg-panel-2/70 text-faint"
                          )}
                        >
                          <History size={10} />
                          {cacheInfo.stale ? "salvo" : "cache"}{" "}
                          {new Date(cacheInfo.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMapOpen((o) => !o)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-bold transition-all",
                        mapOpen
                          ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300"
                          : "border-line bg-ink-2/70 text-mute hover:border-line-2 hover:text-emerald-100"
                      )}
                    >
                      <MapIcon size={15} /> Mapa
                    </button>
                    <button
                      type="button"
                      onClick={exportCsv}
                      disabled={filtered.length === 0}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-bold transition-all",
                        filtered.length > 0
                          ? "bg-emerald-400 text-emerald-950 shadow-[0_0_26px_-6px_rgba(52,211,153,0.5)] hover:bg-emerald-300 active:scale-[0.98]"
                          : "cursor-not-allowed bg-line/60 text-faint"
                      )}
                    >
                      <Download size={15} /> Exportar CSV
                    </button>
                  </div>
                </div>

                <StatsBar {...stats} />

                {/* aviso: a fonte esgotou antes de bater a meta */}
                {exhausted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-start gap-2.5 rounded-2xl border border-sky-400/30 bg-sky-400/[0.07] px-4 py-3 text-[12px] leading-relaxed text-sky-200/90"
                  >
                    <Gauge size={15} className="mt-0.5 shrink-0" />
                    <p>
                      A fonte <b>esgotou</b>: entregamos <b>{exhausted.found}</b> de {exhausted.wanted} leads
                      após varrer {exhausted.cities} cidades. Paramos sozinhos para não gastar créditos à
                      toa. Para conseguir mais: troque a fonte, escolha outra categoria ou reduza os
                      filtros (ex.: WhatsApp em <b>todos</b>).
                    </p>
                  </motion.div>
                )}

                {/* aviso: fonte fora do ar, mostrando dados salvos */}
                {cacheInfo?.stale && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-start gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3 text-[12px] leading-relaxed text-amber-200/90"
                  >
                    <CircleAlert size={15} className="mt-0.5 shrink-0" />
                    <p>
                      A fonte gratuita está congestionada agora, então mostramos o <b>último resultado salvo</b>{" "}
                      dessa busca. Quer dados fresquinhos? Aguarde 1–2 minutos e clique em buscar novamente.
                    </p>
                  </motion.div>
                )}

                {/* aviso de meta não atingida */}
                {shortfall && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-start gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3 text-[12px] leading-relaxed text-amber-200/90"
                  >
                    <CircleAlert size={15} className="mt-0.5 shrink-0" />
                    <p>
                      A fonte retornou só <b>{filtered.length}</b> lead(s) com os filtros ativos — a meta era{" "}
                      <b>{target}</b>. Para bater a meta: deixe WhatsApp em <b>todos</b>, escolha uma cidade
                      maior{source === "osm" ? " (ou troque para a fonte Google, que tem base mais completa)" : ""}.
                    </p>
                  </motion.div>
                )}

                {/* mapa embutido (sem precisar de chave) */}
                <AnimatePresence>
                  {mapOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 300, opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden rounded-2xl border border-line"
                    >
                      <iframe
                        title="Mapa da região pesquisada"
                        src={`https://www.google.com/maps?q=${encodeURIComponent(`${category} ${city} ${uf}`)}&z=13&output=embed`}
                        className="h-[300px] w-full grayscale-[35%] invert-[92%] hue-rotate-180 contrast-[0.9]"
                        loading="lazy"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* grade de leads */}
                {filtered.length > 0 ? (
                  <div className="grid gap-3 pb-6 sm:grid-cols-2 2xl:grid-cols-3">
                    {filtered.map((lead, i) => (
                      <LeadCard key={lead.id} lead={lead} index={i} onCompose={setCompose} />
                    ))}
                  </div>
                ) : (
                  <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl border border-line bg-ink-2/60 px-8 py-14 text-center">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-line bg-panel">
                      {rawLeads.length === 0 ? (
                        <GlobeLock size={20} className="text-faint" />
                      ) : (
                        <ListX size={20} className="text-faint" />
                      )}
                    </div>
                    <h3 className="font-display text-[16px] font-bold text-emerald-50">
                      {rawLeads.length === 0 ? "Nenhuma empresa encontrada" : "Nada passou pelos filtros"}
                    </h3>
                    <p className="text-[12.5px] leading-relaxed text-faint">
                      {rawLeads.length === 0
                        ? source === "osm"
                          ? "O OpenStreetMap pode ter poucos dados nesse município/categoria. Tente uma cidade próxima maior ou use a fonte Google."
                          : "Tente outra categoria ou cidade."
                        : "Ajuste os filtros de site/WhatsApp na lateral para ampliar o resultado."}
                    </p>
                    {rawLeads.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSiteFilter("todos");
                          setWaFilter("todos");
                          setEmailFilter("todos");
                          setSocialFilter("todos");
                        }}
                        className="mt-1 rounded-xl border border-line bg-panel px-4 py-2 text-[12px] font-bold text-emerald-200 transition-all hover:border-line-2"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* compositor de mensagem */}
      <AnimatePresence>
        {compose && (
          <MessageComposer
            lead={compose}
            template={template}
            onTemplate={handleTemplate}
            city={displayCity}
            onClose={() => setCompose(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
