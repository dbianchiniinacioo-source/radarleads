/* ------------------------------------------------------------------ */
/*  Fonte Geoapify — Location Search API (v2)                            */
/*  Plano grátis: 3.000 créditos/dia · SEM cartão de crédito           */
/*  Cadastro: myprojects.geoapify.com (leva 1 minuto)                   */
/*  Traz nome, endereço, telefone, site e categorias de cada loja.     */
/* ------------------------------------------------------------------ */

import { classifyWebPresence, cleanEmail, detectWhatsapp, PlacesError, type Lead } from "./places";
import { getCountry, type CountryCode } from "./countries";
import { addUsage } from "./credits";

const GEOCODE = "https://api.geoapify.com/v1/geocode/search";
const PLACES = "https://api.geoapify.com/v2/places";

/* --------------------------------------------------------------- */
/*  Categorias REAIS da Geoapify (doc: apidocs.geoapify.com/... )   */
/*  Só chaves que existem de fato na árvore suportada.              */
/* --------------------------------------------------------------- */
const GEOAPIFY_CATS: Record<string, string> = {
  "Restaurante": "catering.restaurant",
  "Pizzaria": "catering.restaurant,catering.fast_food",
  "Lanchonete": "catering.fast_food,catering.cafe",
  "Hamburgueria": "catering.restaurant,catering.fast_food",
  "Churrascaria": "catering.restaurant",
  "Sushi": "catering.restaurant",
  "Bar": "catering.bar,catering.pub,catering.biergarten",
  "Cafeteria": "catering.cafe",
  "Sorveteria": "catering.ice_cream,catering.cafe",
  "Padaria": "commercial.food_and_drink",
  "Confeitaria": "commercial.food_and_drink",
  "Farmácia": "healthcare.pharmacy,commercial.chemist_and_pharmacy",
  "Academia": "sport.fitness,sport,leisure.sports_centre",
  "Salão de beleza": "beauty.hairdresser",
  "Barbearia": "beauty.hairdresser",
  "Estética": "beauty",
  "Oficina mecânica": "service.vehicle.car_repair,service.vehicle",
  "Borracharia": "service.vehicle,commercial",
  "Lava jato": "service.cleaning",
  "Autopeças": "commercial",
  "Pet shop": "commercial.pet,service",
  "Veterinário": "healthcare.veterinary",
  "Supermercado": "commercial.supermarket,commercial.grocery",
  "Mercearia": "commercial.grocery,commercial.food_and_drink,commercial",
  "Açougue": "commercial.food_and_drink,commercial",
  "Hortifruti": "commercial.marketplace,commercial.food_and_drink",
  "Ótica": "commercial",
  "Floricultura": "commercial.florist",
  "Joalheria": "commercial.jewelry",
  "Roupas": "commercial.clothing",
  "Calçados": "commercial.shoes",
  "Móveis": "commercial.furniture_and_gain,commercial.houseware_and_hardware",
  "Material de construção": "commercial.doityourself,commercial.trade,commercial.garden",
  "Ferragens": "commercial.doityourself,commercial.houseware_and_hardware",
  "Informática": "commercial.electronics,office",
  "Celulares": "commercial.electronics,commercial",
  "Imobiliária": "office.estate_agent,office",
  "Dentista": "healthcare.dentist",
  "Clínica médica": "healthcare",
  "Hotel/Pousada": "accommodation",
  "Escola/Curso": "education",
  "Geral": "catering,commercial,service,healthcare",
};

/* tokens pra filtrar o resultado localmente por palavra-chave da categoria */
const CATEGORY_TOKENS: Record<string, string[]> = {
  Restaurante: ["restaurant", "catering"],
  Pizzaria: ["pizza", "restaurant", "fast_food"],
  Lanchonete: ["fast_food", "catering", "restaurant"],
  Hamburgueria: ["burger", "fast_food", "restaurant"],
  Churrascaria: ["churrasco", "restaurant", "catering"],
  Sushi: ["sushi", "japanese", "restaurant"],
  Bar: ["bar", "pub", "biergarten", "catering"],
  Cafeteria: ["cafe", "coffee", "catering"],
  Sorveteria: ["ice_cream", "gelato", "cafe"],
  Padaria: ["bakery", "bread", "food", "grocery", "convenience"],
  Confeitaria: ["bakery", "cake", "confection", "food"],
  "Farmácia": ["pharmacy", "chemist", "drug"],
  Academia: ["fitness", "gym", "sport"],
  "Salão de beleza": ["hairdresser", "beauty", "hair", "barber"],
  Barbearia: ["hairdresser", "beauty", "barber"],
  Estética: ["beauty", "spa", "hairdresser"],
  "Oficina mecânica": ["car_repair", "vehicle", "mechanic", "repair"],
  Borracharia: ["tyres", "tire", "vehicle", "car_repair"],
  "Lava jato": ["car_wash", "cleaning", "laundry"],
  Autopeças: ["car_parts", "auto", "vehicle", "automotive"],
  "Pet shop": ["pet", "veterinary"],
  Veterinário: ["veterinary", "pet"],
  Supermercado: ["supermarket", "grocery", "marketplace"],
  Mercearia: ["grocery", "convenience", "food", "marketplace"],
  Açougue: ["butcher", "food"],
  Hortifruti: ["food", "grocery", "marketplace", "greengrocer"],
  Ótica: ["optician", "optical"],
  Floricultura: ["florist", "flower"],
  Joalheria: ["jewelry", "jewel"],
  Roupas: ["clothing", "shop", "boutique", "fashion"],
  Calçados: ["shoes", "footwear", "shoe"],
  Móveis: ["furniture", "decor", "houseware"],
  "Material de construção": ["doityourself", "hardware", "trade", "build"],
  Ferragens: ["hardware", "doityourself", "iron"],
  Informática: ["computer", "electronics", "office"],
  Celulares: ["mobile", "electronics", "phone"],
  Imobiliária: ["estate", "real_estate", "offic"],
  Dentista: ["dentist"],
  "Clínica médica": ["clinic", "doctors", "hospital", "health", "physician"],
  "Hotel/Pousada": ["hotel", "accommodation", "motel", "hostel", "guest_house"],
  "Escola/Curso": ["school", "education", "college", "university"],
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

interface GeoFeature {
  type?: string;
  geometry?: { type?: string; coordinates?: [number, number] };
  properties?: {
    place_id?: string;
    name?: string;
    formatted?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    categories?: string[];
    website?: string;
    email?: string;
    contact?: { phone?: string; website?: string; email?: string };
    datasource?: { raw?: Record<string, unknown> };
    lat?: number;
    lon?: number;
  };
}

async function geoFetch(url: string, label: string): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new PlacesError("Falha de rede ao contatar a Geoapify.", "Verifique a internet e tente de novo.");
  }
  if (res.status === 401 || res.status === 403) {
    throw new PlacesError(
      "Chave Geoapify inválida.",
      "Crie a conta grátis (sem cartão) em myprojects.geoapify.com, gere uma API key e cole aqui."
    );
  }
  if (res.status === 429) {
    throw new PlacesError(
      "Limite diário grátis da Geoapify atingido (3.000 créditos).",
      "Renova a cada 24h. Enquanto isso, use a fonte OpenStreetMap, que não tem limite de conta."
    );
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new PlacesError(`A Geoapify respondeu erro ${res.status} (${label}).`, txt.slice(0, 180) || undefined);
  }
  const data = await res.json();
  /* mede o custo exato desta chamada (doc: 1 + 1 a cada 20 lugares extras) */
  const places = Array.isArray(data?.features) ? data.features.length : 0;
  addUsage("geoapify", label === "places" ? places : 0, label === "places" ? "busca de lugares" : "geocodificação");
  return data;
}

export interface GeoapifyRequirements {
  email?: "com" | "sem" | "todos";
  site?: "com" | "sem" | "todos";
  social?: "com" | "sem" | "todos";
  phone?: "com" | "sem" | "todos";
}

export interface GeoapifySearchOptions {
  query: string;
  city: string;
  country?: CountryCode;
  requirements?: GeoapifyRequirements;
  /** quantos leads válidos precisamos — a busca pagina até atingir */
  target?: number;
  onPhase?: (phase: string) => void;
}

export async function searchGeoapify(apiKey: string, opts: GeoapifySearchOptions): Promise<Lead[]> {
  const { query, city, onPhase } = opts;
  const country = opts.country ?? "BR";
  const req = opts.requirements ?? {};
  const target = opts.target ?? 20;
  const cfg = getCountry(country);

  /* 1) geocodifica a cidade */
  onPhase?.("Localizando a cidade…");
  const geoUrl =
    `${GEOCODE}?text=${encodeURIComponent(city)}&countrycode=${cfg.iso}&limit=1&format=json&apiKey=${encodeURIComponent(apiKey)}`;
  const geo = await geoFetch(geoUrl, "geocoding");
  const hit = geo?.results?.[0];
  if (!hit || hit.lat === undefined) {
    throw new PlacesError(
      "Cidade não encontrada.",
      "Confira a grafia do município (ex.: 'Natal, RN')."
    );
  }
  const lat = Number(hit.lat);
  const lon = Number(hit.lon);

  /* 2) prepara */
  const geoCats = GEOAPIFY_CATS[query] ?? "commercial,catering,service,healthcare";
  const tokens = CATEGORY_TOKENS[query] ?? [];
  const seen = new Set<string>();
  const leads: Lead[] = [];

  const categoryLabel = (cats: string[] | undefined): string | undefined => {
    if (!cats || cats.length === 0) return undefined;
    const safe = cats.filter((c): c is string => typeof c === "string" && c.length > 0);
    const prefer = safe.find((c) => c.includes("."));
    const pick = prefer ?? safe[0];
    if (!pick) return undefined;
    const withoutPrefix = pick.split(".").slice(1).join(" ").replace(/_/g, " ");
    return withoutPrefix ? withoutPrefix.charAt(0).toUpperCase() + withoutPrefix.slice(1) : undefined;
  };

  const addFeatures = (data: { features?: GeoFeature[] }) => {
    for (const f of data.features ?? []) {
      const p = f.properties;
      const name = p?.name?.trim();
      if (!name) continue;

      const cats: string[] = (p?.categories ?? []).filter((c) => typeof c === "string");
      const catStr = cats.map(norm).join(" ");
      const id = p?.place_id || `${name}-${f.geometry?.coordinates?.join(",") || p?.formatted || ""}`;

      /* se o termo da busca tiver tokens definidos, exigimos compatibilidade */
      if (tokens.length > 0 && cats.length > 0 && !tokens.some((t) => catStr.includes(norm(t)))) continue;

      if (seen.has(id)) continue;
      seen.add(id);

      const phone = p?.contact?.phone || undefined;
      const wa = detectWhatsapp(phone, undefined, country, cfg.dial);
      const siteRaw = p?.website || p?.contact?.website;
      const wp = classifyWebPresence(siteRaw);
      const raw = p?.datasource?.raw as Record<string, string> | undefined;
      const email = cleanEmail(
        p?.contact?.email || p?.email || raw?.email || raw?.["contact:email"]
      );

      const addressParts = [
        p?.street ? `${p.street}${p.housenumber ? ", " + p.housenumber : ""}` : undefined,
        p?.city,
        p?.state,
      ].filter(Boolean);
      const address = addressParts.length ? addressParts.join(" — ") : p?.formatted;

      const coords = f.geometry?.coordinates;
      const fallbackLon = p?.lon;
      const fallbackLat = p?.lat;

      leads.push({
        id: `geo-${id}`,
        name,
        address,
        phoneNational: phone,
        phoneIntl: phone,
        email,
        website: wp.website,
        instagramUrl: wp.instagramUrl,
        facebookUrl: wp.facebookUrl,
        mapsUrl:
          coords || (fallbackLon !== undefined && fallbackLat !== undefined)
            ? `https://www.google.com/maps/search/?api=1&query=${
                coords ? `${coords[1]},${coords[0]}` : `${fallbackLat},${fallbackLon}`
              }`
            : undefined,
        primaryType: categoryLabel(cats) ?? query,
        hasSite: Boolean(wp.website),
        hasEmail: Boolean(email),
        hasSocial: Boolean(wp.instagramUrl || wp.facebookUrl),
        whatsapp: wa.status,
        waLink: wa.waLink,
        source: "geoapify",
      });
    }
  };

  /** aplica as exigências do usuário — só entra quem atende de verdade */
  const matchesRequirements = (l: Lead): boolean => {
    if (req.email === "com" && !l.hasEmail) return false;
    if (req.email === "sem" && l.hasEmail) return false;
    if (req.site === "com" && !l.hasSite) return false;
    if (req.site === "sem" && l.hasSite) return false;
    if (req.social === "com" && !l.hasSocial) return false;
    if (req.social === "sem" && l.hasSocial) return false;
    if (req.phone === "com" && l.whatsapp !== "provavel") return false;
    if (req.phone === "sem" && l.whatsapp === "provavel") return false;
    return true;
  };
  const validCount = () => leads.filter(matchesRequirements).length;

  /* 3) primeira passada: raio de 12 km, com categories da categoria escolhida.
        Doc: filter=circle:lon,lat,radiusMeters (x, y). */
  const fetchCats = async (cats: string, radius: number, offset = 0) => {
    const url =
      `${PLACES}?categories=${encodeURIComponent(cats)}` +
      `&filter=circle:${lon},${lat},${radius}&limit=500${offset ? `&offset=${offset}` : ""}` +
      `&lang=${cfg.lang}&apiKey=${encodeURIComponent(apiKey)}`;
    const data = await geoFetch(url, "places");
    addFeatures(data);
    return (data?.features?.length ?? 0) as number;
  };

  /* raios progressivos; em cada um, pagina até juntar o suficiente */
  const radii = [12_000, 40_000, 80_000];
  for (const radius of radii) {
    if (validCount() >= target) break;
    onPhase?.(
      radius === 12_000
        ? `Buscando ${query} perto do centro…`
        : `Ampliando o raio para ${radius / 1000} km…`
    );
    for (let offset = 0; offset <= 1500; offset += 500) {
      const got = await fetchCats(geoCats, radius, offset);
      if (validCount() >= target) break;
      if (got < 500) break; // acabou a lista nesse raio
      onPhase?.(`Buscando mais resultados (${leads.length} analisados)…`);
    }
  }

  /* fallback: categorias gerais, se ainda faltar */
  if (validCount() < target) {
    onPhase?.("Generalizando a busca…");
    await fetchCats(GEOAPIFY_CATS.Geral, 25_000);
  }

  /* fallback final: por nome */
  if (validCount() < target) {
    onPhase?.("Último passe por nome…");
    const nameUrl =
      `${PLACES}?categories=commercial,catering&name=${encodeURIComponent(query)}` +
      `&filter=circle:${lon},${lat},25000&limit=500&apiKey=${encodeURIComponent(apiKey)}`;
    addFeatures(await geoFetch(nameUrl, "places"));
  }

  onPhase?.("Organizando resultados…");
  return leads;
}
