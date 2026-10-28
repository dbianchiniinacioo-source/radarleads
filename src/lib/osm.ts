/* ------------------------------------------------------------------ */
/*  Fonte GRATUITA — OpenStreetMap (Nominatim + Overpass API)          */
/*  Sem chave, sem cartão. Queries leves + corrida de espelhos.        */
/* ------------------------------------------------------------------ */

import { classifyWebPresence, cleanEmail, detectWhatsapp, PlacesError, type Lead } from "./places";
import { getCountry, type CountryCode } from "./countries";
import { addUsage } from "./credits";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const MIRRORS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const PER_TRY_MS = 22_000;
const RETRY_WAIT_MS = 20_000;

interface BBox {
  s: number;
  w: number;
  n: number;
  e: number;
  label: string;
  lat: number;
  lon: number;
}

/* ------------------------- geocodificação ------------------------- */

export async function geocodeCity(city: string, iso = "br", lang = "pt-BR"): Promise<BBox | null> {
  /* candidatos: "Cidade, Região" e, se falhar, só "Cidade"
     (regiões como "North West England" não existem no Nominatim) */
  const parts = city.split(",").map((s) => s.trim()).filter(Boolean);
  const candidates = Array.from(
    new Set([city, parts.slice(0, 2).join(", "), parts[0]].filter(Boolean))
  );

  for (const termo of candidates) {
    const res = await fetch(
      `${NOMINATIM}?format=jsonv2&limit=1&countrycodes=${iso}&q=${encodeURIComponent(termo)}`,
      { headers: { "Accept-Language": lang } }
    ).catch(() => null);
    if (!res || !res.ok) continue;

    const data: any[] = await res.json().catch(() => []);
    const item = data?.[0];
    if (item?.boundingbox) {
      let [minLat, maxLat, minLon, maxLon] = item.boundingbox.map(Number);
      const lat = Number(item.lat);
      const lon = Number(item.lon);
      // limita áreas gigantes (ex.: estados) a um recorte em torno do centro
      if (maxLat - minLat > 0.5) {
        minLat = lat - 0.25;
        maxLat = lat + 0.25;
      }
      if (maxLon - minLon > 0.5) {
        minLon = lon - 0.25;
        maxLon = lon + 0.25;
      }
      return { s: minLat, w: minLon, n: maxLat, e: maxLon, label: String(item.display_name || city), lat, lon };
    }
    /* sem resultado: tenta o próximo candidato (termo mais curto) */
  }
  return null;
}

/* ------------------- léxico de categorias pt-BR ------------------- */

interface CatDef {
  match: RegExp;
  tags: [string, string][];
  label: string;
  cuisineRe?: string;
}

const OSM_CATEGORIES: CatDef[] = [
  { match: /padaria|panific|p[ãa]o/i, tags: [["shop", "bakery"]], label: "Padaria" },
  { match: /confeitaria|doceria|bolo|doce/i, tags: [["shop", "pastry"], ["shop", "confectionery"]], label: "Confeitaria" },
  { match: /sorvete|a[çc]a[íi]/i, tags: [["amenity", "ice_cream"]], label: "Sorveteria" },
  { match: /barbearia|barber|corte masculino/i, tags: [["shop", "hairdresser"]], label: "Barbearia" },
  { match: /sal[ãa]o|cabel/i, tags: [["shop", "hairdresser"]], label: "Salão de beleza" },
  { match: /est[ée]tica|beleza|manicure|unha|depila|massag|sobrancelha/i, tags: [["shop", "beauty"], ["shop", "massage"]], label: "Estética" },
  { match: /tatuagem|tattoo|piercing/i, tags: [["shop", "tattoo"]], label: "Tatuagem" },
  { match: /oficina|mec[âa]nic|auto center/i, tags: [["shop", "car_repair"]], label: "Oficina mecânica" },
  { match: /borracharia|pneu/i, tags: [["shop", "tyres"]], label: "Borracharia" },
  { match: /lava.?jato|lava.?car|detalhamento/i, tags: [["amenity", "car_wash"]], label: "Lava jato" },
  { match: /autope|pe[çc]as/i, tags: [["shop", "car_parts"]], label: "Autopeças" },
  { match: /pizzaria|pizza/i, tags: [["amenity", "restaurant"], ["amenity", "fast_food"]], label: "Pizzaria", cuisineRe: "pizza" },
  { match: /hamburg/i, tags: [["amenity", "fast_food"]], label: "Hamburgueria", cuisineRe: "burger" },
  { match: /lanchonete|lanche|esfih/i, tags: [["amenity", "fast_food"]], label: "Lanchonete" },
  { match: /marmita|self.?service|comida caseira|restaurante/i, tags: [["amenity", "restaurant"]], label: "Restaurante" },
  { match: /churrasc/i, tags: [["amenity", "restaurant"]], label: "Churrascaria", cuisineRe: "steak_house|barbecue|bbq|churrasco" },
  { match: /sushi|japon[êe]s/i, tags: [["amenity", "restaurant"]], label: "Comida japonesa", cuisineRe: "sushi|japanese" },
  { match: /cafeter|coffee|caf[ée]\b/i, tags: [["amenity", "cafe"]], label: "Cafeteria" },
  { match: /\bbar\b|boteco|pub|cervej/i, tags: [["amenity", "bar"], ["amenity", "pub"], ["amenity", "biergarten"]], label: "Bar" },
  { match: /farm[áa]cia|drogaria|manipul/i, tags: [["amenity", "pharmacy"]], label: "Farmácia" },
  { match: /pet.?shop|banho e tosa/i, tags: [["shop", "pet"]], label: "Pet shop" },
  { match: /veterin/i, tags: [["amenity", "veterinary"]], label: "Veterinário" },
  { match: /academia|crossfit|muscula|gym|fitness/i, tags: [["leisure", "fitness_centre"], ["leisure", "sports_centre"]], label: "Academia" },
  { match: /pilates|fisioterapia|fisio/i, tags: [["healthcare", "physiotherapist"]], label: "Fisioterapia" },
  { match: /imobil|corretor/i, tags: [["office", "real_estate"]], label: "Imobiliária" },
  { match: /contabil|contador/i, tags: [["office", "accountant"]], label: "Contabilidade" },
  { match: /advog|direito|jur[íi]dic/i, tags: [["office", "lawyer"]], label: "Escritório de advocacia" },
  { match: /supermercado|atacad/i, tags: [["shop", "supermarket"], ["shop", "wholesale"]], label: "Supermercado" },
  { match: /mercearia|minimercado|mercadinho|conveni[êe]ncia|\bmercado\b/i, tags: [["shop", "convenience"]], label: "Mercearia" },
  { match: /hortifr|verdur|sacol[ãa]o/i, tags: [["shop", "greengrocer"]], label: "Hortifruti" },
  { match: /a[çc]ougue|carnes/i, tags: [["shop", "butcher"]], label: "Açougue" },
  { match: /peixaria|pescad/i, tags: [["shop", "seafood"]], label: "Peixaria" },
  { match: /dentista|odonto/i, tags: [["amenity", "dentist"]], label: "Dentista" },
  { match: /psic[óo]log|terapia/i, tags: [["healthcare", "psychotherapist"]], label: "Psicólogo" },
  { match: /cl[íi]nica|m[ée]dic|consult[óo]rio/i, tags: [["amenity", "clinic"], ["amenity", "doctors"]], label: "Clínica" },
  { match: /floricultura|\bflor\b|flores/i, tags: [["shop", "florist"]], label: "Floricultura" },
  { match: /[óo]tica|[óo]culos/i, tags: [["shop", "optician"]], label: "Ótica" },
  { match: /material de constru|constrular|deposito de materia/i, tags: [["shop", "doityourself"], ["shop", "trade"], ["shop", "hardware"]], label: "Material de construção" },
  { match: /ferragem|ferramenta/i, tags: [["shop", "hardware"]], label: "Ferragens" },
  { match: /tintas/i, tags: [["shop", "paint"]], label: "Tintas" },
  { match: /el[ée]tric/i, tags: [["shop", "electrical"]], label: "Elétrica" },
  { match: /eletr[ôo]nic/i, tags: [["shop", "electronics"]], label: "Eletrônicos" },
  { match: /celular|smartphone|iphone/i, tags: [["shop", "mobile_phone"]], label: "Celulares" },
  { match: /inform[áa]tica|computador|notebook/i, tags: [["shop", "computer"]], label: "Informática" },
  { match: /roupa|moda|boutique|vestu[áa]rio/i, tags: [["shop", "clothes"]], label: "Roupas" },
  { match: /cal[çc]ado|sapato|t[êe]nis/i, tags: [["shop", "shoes"]], label: "Calçados" },
  { match: /m[óo]veis|m[óo]vel|mobili/i, tags: [["shop", "furniture"]], label: "Móveis" },
  { match: /cama|mesa e banho|colch/i, tags: [["shop", "bed"]], label: "Cama, mesa e banho" },
  { match: /bicicletaria|\bbike\b/i, tags: [["shop", "bicycle"]], label: "Bicicletaria" },
  { match: /lavanderia|lava.?roupa/i, tags: [["shop", "laundry"]], label: "Lavanderia" },
  { match: /gr[áa]fica|copiadora|impress/i, tags: [["shop", "copyshop"]], label: "Gráfica" },
  { match: /joalheria|joia|semijoia|bijuteria/i, tags: [["shop", "jewelry"]], label: "Joalheria" },
  { match: /papelaria/i, tags: [["shop", "stationery"]], label: "Papelaria" },
  { match: /livraria|livro/i, tags: [["shop", "books"]], label: "Livraria" },
  { match: /brinquedo/i, tags: [["shop", "toys"]], label: "Brinquedos" },
  { match: /suplement/i, tags: [["shop", "nutrition_supplements"]], label: "Suplementos" },
  { match: /artigos esportivos|esporte/i, tags: [["shop", "sports"]], label: "Artigos esportivos" },
  { match: /hotel|pousada|hostel|hosped/i, tags: [["tourism", "hotel"], ["tourism", "guest_house"], ["tourism", "hostel"]], label: "Hospedagem" },
  { match: /escola|curso|idioma/i, tags: [["amenity", "school"], ["amenity", "language_school"]], label: "Escola/Curso" },
  { match: /autoescola|auto escola|cfc/i, tags: [["amenity", "driving_school"]], label: "Autoescola" },
  { match: /posto|combust[íi]vel|gasolina/i, tags: [["amenity", "fuel"]], label: "Posto de combustível" },
  { match: /lot[ée]rica/i, tags: [["shop", "lottery"]], label: "Lotérica" },
  { match: /chaveiro/i, tags: [["craft", "key_cutter"]], label: "Chaveiro" },
  { match: /costura|ateli[êe]|alfaiate/i, tags: [["shop", "tailor"]], label: "Costura/Ateliê" },
  { match: /presente|utilidade|bazar/i, tags: [["shop", "gift"], ["shop", "variety_store"]], label: "Presentes/Utilidades" },
  { match: /ag[êe]ncia de viagem|viagens|turismo/i, tags: [["shop", "travel_agency"]], label: "Agência de viagem" },
  { match: /funer[áa]ria/i, tags: [["shop", "funeral_directors"]], label: "Funerária" },
  { match: /[áa]gua mineral|distribuidora/i, tags: [["shop", "beverages"], ["shop", "water"]], label: "Distribuidora" },
];

/* dicionário reverso: tag → rótulo amigável */
const TAG_LABEL: Record<string, string> = Object.fromEntries(
  OSM_CATEGORIES.flatMap((c) => c.tags.map(([k, v]) => [`${k}_${v}`, c.label]))
);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

/* ------------------------- query Overpass -------------------------
 * Leve por padrão: apenas filtros de TAG indexados.
 * Regex no nome só entra quando a categoria é desconhecida.
 * ------------------------------------------------------------------ */

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** exigências aplicadas DENTRO da query (o servidor já devolve só o que serve) */
export interface OsmRequirements {
  /** "com" exige tag de e-mail · "sem" exclui quem tem */
  email?: "com" | "sem" | "todos";
  /** "com" exige site · "sem" exclui quem tem site */
  site?: "com" | "sem" | "todos";
  /** "com" exige rede social · "sem" exclui quem tem */
  social?: "com" | "sem" | "todos";
  /** "com" exige telefone (pré-requisito do WhatsApp) */
  phone?: "com" | "sem" | "todos";
}

const EMAIL_KEYS = ["contact:email", "email"];
const SITE_KEYS = ["website", "contact:website", "url"];
const SOCIAL_KEYS = ["contact:instagram", "instagram", "contact:facebook", "facebook"];
const PHONE_KEYS = ["phone", "contact:phone", "contact:mobile", "mobile", "contact:whatsapp"];

/** monta sufixos de tag: alternativas viram variantes (OR); exclusões viram [!tag] */
function requirementSuffixes(req: OsmRequirements): string[] {
  let variants: string[] = [""];

  const applyRequired = (keys: string[]) => {
    const next: string[] = [];
    for (const v of variants) for (const k of keys) next.push(`${v}["${k}"]`);
    variants = next;
  };
  const applyExcluded = (keys: string[]) => {
    const neg = keys.map((k) => `[!"${k}"]`).join("");
    variants = variants.map((v) => v + neg);
  };

  if (req.email === "com") applyRequired(EMAIL_KEYS);
  else if (req.email === "sem") applyExcluded(EMAIL_KEYS);

  if (req.site === "com") applyRequired(SITE_KEYS);
  else if (req.site === "sem") applyExcluded(SITE_KEYS);

  if (req.social === "com") applyRequired(SOCIAL_KEYS);
  else if (req.social === "sem") applyExcluded(SOCIAL_KEYS);

  if (req.phone === "com") applyRequired(PHONE_KEYS);

  return variants;
}

function buildQuery(
  query: string,
  bb: BBox,
  smaller = false,
  req: OsmRequirements = {}
): { ql: string; cat?: CatDef } {
  const shrink = smaller ? 0.06 : 0;
  const s = bb.s + shrink;
  const n = bb.n - shrink;
  const w = bb.w + shrink;
  const e = bb.e - shrink;
  const bbox = `(${s},${w},${n},${e})`;
  const clauses: string[] = [];
  const cat = OSM_CATEGORIES.find((c) => c.match.test(query));
  const suffixes = requirementSuffixes(req);

  const push = (base: string) => {
    for (const sfx of suffixes) {
      clauses.push(`node${base}${sfx}${bbox};`);
      clauses.push(`way${base}${sfx}${bbox};`);
    }
  };

  if (cat) {
    for (const [k, v] of cat.tags) push(`["${k}"="${v}"]["name"]`);
    if (cat.cuisineRe) push(`["amenity"]["cuisine"~"${cat.cuisineRe}",i]["name"]`);
  } else {
    const re = escapeRe(query.trim());
    for (const k of ["shop", "amenity"]) push(`["name"~"${re}",i]["${k}"]`);
  }

  return { ql: `[out:json][timeout:22];\n(\n${clauses.join("\n")}\n);\nout center tags 250;`, cat };
}

/* ------------------- corrida de espelhos Overpass ------------------- */

interface OsmResponse {
  elements?: OsmElement[];
  remark?: string;
}

async function tryMirror(url: string, body: string, ctl: AbortController): Promise<OsmResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body,
    signal: ctl.signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: OsmResponse = await res.json();
  if ((!data.elements || data.elements.length === 0) && data.remark && /error|timed out/i.test(data.remark)) {
    throw new Error("timeout no servidor");
  }
  return data;
}

/** dispara N espelhos em paralelo e usa o primeiro que responder */
function raceMirrors(urls: string[], ql: string): Promise<OsmResponse> {
  const ctls = urls.map(() => new AbortController());
  const timers = urls.map((_, i) => setTimeout(() => ctls[i].abort(), PER_TRY_MS));
  const body = "data=" + encodeURIComponent(ql);

  return new Promise((resolve, reject) => {
    let pending = urls.length;
    const errs: string[] = new Array(urls.length);
    urls.forEach((u, i) => {
      tryMirror(u, body, ctls[i])
        .then((d) => {
          ctls.forEach((c, j) => j !== i && c.abort());
          timers.forEach(clearTimeout);
          resolve(d);
        })
        .catch((e) => {
          errs[i] = e instanceof Error && e.name === "AbortError" ? "tempo esgotado" : String(e instanceof Error ? e.message : e);
          pending -= 1;
          if (pending === 0) {
            timers.forEach(clearTimeout);
            reject(errs);
          }
        });
    });
  });
}

/* --------------------------- mapeamento --------------------------- */

interface OsmElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function waFromDigits(raw: string, dial = "55"): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0")) d = d.slice(1);
  if (!d.startsWith(dial)) d = dial + d;
  return d;
}

function mapElement(el: OsmElement, cityLabel: string, cat?: CatDef, country: CountryCode = "BR"): Lead | null {
  const dial = getCountry(country).dial;
  const t = el.tags || {};
  const name = t.name?.trim();
  if (!name) return null;

  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;

  /* endereço */
  const street = t["addr:street"];
  const line1 = street ? `${street}${t["addr:housenumber"] ? ", " + t["addr:housenumber"] : ""}` : undefined;
  const rest = [t["addr:suburb"] || t["addr:neighbourhood"], t["addr:city"], t["addr:state"]]
    .filter(Boolean)
    .join(", ");
  const address = [line1, rest].filter(Boolean).join(" — ") || undefined;

  /* telefones / whatsapp */
  const phoneRaw = t["contact:phone"] || t.phone;
  const mobileRaw = t["contact:mobile"] || t.mobile;
  const waTag = t["contact:whatsapp"];

  let whatsapp: Lead["whatsapp"] = "sem-telefone";
  let waLink: string | undefined;
  if (waTag) {
    whatsapp = "provavel";
    waLink = `https://wa.me/${waFromDigits(waTag, dial)}`;
  } else if (mobileRaw) {
    whatsapp = "provavel";
    waLink = `https://wa.me/${waFromDigits(mobileRaw, dial)}`;
  } else if (phoneRaw) {
    const wa = detectWhatsapp(phoneRaw, undefined, country, dial);
    whatsapp = wa.status;
    waLink = wa.status === "provavel" && wa.waLink ? wa.waLink : undefined;
  }

  const phoneNational = phoneRaw || mobileRaw;
  const email = cleanEmail(t["contact:email"] || t.email);

  /* site / redes sociais */
  const wp = classifyWebPresence(t.website || t["contact:website"] || t.url, {
    instagram: t["contact:instagram"] || t.instagram,
    facebook: t["contact:facebook"] || t.facebook,
  });

  /* tipo */
  let primaryType = cat?.label;
  if (!primaryType) {
    const kindKeys = ["shop", "amenity", "craft", "office", "tourism", "leisure", "healthcare"];
    for (const k of kindKeys) {
      if (t[k]) {
        primaryType = TAG_LABEL[`${k}_${t[k]}`] || cap(t[k]);
        break;
      }
    }
  }

  const mapsUrl =
    lat && lon
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " " + cityLabel)}`;

  return {
    id: `osm-${el.type}-${el.id}`,
    name,
    address,
    phoneNational,
    phoneIntl: phoneRaw,
    email,
    website: wp.website,
    instagramUrl: wp.instagramUrl,
    facebookUrl: wp.facebookUrl,
    mapsUrl,
    primaryType,
    hasSite: Boolean(wp.website),
    hasEmail: Boolean(email),
    hasSocial: Boolean(wp.instagramUrl || wp.facebookUrl),
    whatsapp,
    waLink,
    source: "osm",
  };
}

/* ----------------------------- busca ----------------------------- */

export interface OsmSearchOptions {
  query: string;
  city: string;
  country?: CountryCode;
  requirements?: OsmRequirements;
  onPhase?: (phase: string) => void;
}

export async function searchOSM(opts: OsmSearchOptions): Promise<Lead[]> {
  const { query, city, onPhase } = opts;
  const country = opts.country ?? "BR";
  const req = opts.requirements ?? {};
  const cfg = getCountry(country);

  onPhase?.("Localizando a cidade no OpenStreetMap…");
  const bb = await geocodeCity(city, cfg.iso, cfg.lang);
  if (!bb) {
    throw new PlacesError(
      "Cidade não encontrada.",
      "Confira a grafia. A busca usa o nome oficial do município."
    );
  }

  const { ql, cat } = buildQuery(query, bb, false, req);
  let data: OsmResponse | null = null;
  let lastErr = "";

  /* tentativa 1 — corrida entre os espelhos principais */
  try {
    onPhase?.(`Consultando OpenStreetMap (${cat?.label || query})…`);
    data = await raceMirrors(MIRRORS.slice(0, 2), ql);
  } catch (e) {
    lastErr = (e as string[])?.filter(Boolean).join(" / ") || "falha";
  }

  /* tentativa 2 — espelhos reserva */
  if (!data) {
    try {
      onPhase?.("Servidores ocupados… tentando espelhos reserva");
      data = await raceMirrors(MIRRORS.slice(2, 4), ql);
    } catch (e) {
      lastErr = (e as string[])?.filter(Boolean).join(" / ") || lastErr;
    }
  }

  /* tentativa 3 — área menor (bem mais leve pro servidor) */
  if (!data) {
    try {
      onPhase?.("Reduzindo a área ao centro da cidade…");
      const retry = buildQuery(query, bb, true, req);
      data = await raceMirrors([MIRRORS[0], MIRRORS[4]], retry.ql);
    } catch (e) {
      lastErr = (e as string[])?.filter(Boolean).join(" / ") || lastErr;
    }
  }

  /* tentativa 4 — pausa e tenta de novo (congestionamento costuma passar) */
  if (!data) {
    try {
      onPhase?.("Congestionado — aguardando 20s para a última tentativa…");
      await new Promise((r) => setTimeout(r, RETRY_WAIT_MS));
      onPhase?.("Tentando novamente…");
      data = await raceMirrors([MIRRORS[1], MIRRORS[4]], ql);
    } catch (e) {
      lastErr = (e as string[])?.filter(Boolean).join(" / ") || lastErr;
    }
  }

  if (!data) {
    throw new PlacesError(
      "Os servidores gratuitos do OpenStreetMap estão congestionados agora.",
      `Foram 4 tentativas automáticas (último erro: ${lastErr}). Aguarde 1–2 minutos e tente de novo. Se já buscou essa cidade antes, a gente mostra o último resultado salvo.`
    );
  }

  addUsage("osm", data.elements?.length ?? 0, "consulta Overpass");

  const seen = new Set<string>();
  const leads: Lead[] = [];
  for (const el of data.elements ?? []) {
    const lead = mapElement(el, city, cat, country);
    if (!lead) continue;
    const lat = el.lat ?? el.center?.lat ?? 0;
    const lon = el.lon ?? el.center?.lon ?? 0;
    const key = `${lead.name.toLowerCase()}|${lat.toFixed(4)}|${lon.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    leads.push(lead);
  }

  onPhase?.("Organizando resultados…");
  return leads;
}
