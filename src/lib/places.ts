/* ------------------------------------------------------------------ */
/*  RadarLeads — núcleo de busca no Google Maps (Places API New)       */
/* ------------------------------------------------------------------ */

import { isMobileNumber, type CountryCode } from "./countries";

export type WhatsappStatus = "provavel" | "fixo" | "sem-telefone";
export type SiteFilter = "sem" | "com" | "todos";
export type WaFilter = "todos" | "com" | "sem";
export type EmailFilter = "todos" | "com" | "sem";
export type SocialFilter = "todos" | "com" | "sem";
export type LeadSource = "osm" | "gmaps" | "geoapify";

export interface Lead {
  id: string;
  name: string;
  address?: string;
  phoneNational?: string;
  phoneIntl?: string;
  email?: string;
  website?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  rating?: number;
  ratingCount?: number;
  mapsUrl?: string;
  primaryType?: string;
  hasSite: boolean;
  hasEmail: boolean;
  hasSocial: boolean;
  whatsapp: WhatsappStatus;
  waLink?: string;
  source: LeadSource;
}

/* ---------------- deduplicação de empresas repetidas ---------------- */

const SUFFIXES =
  /\b(ltda|me|epp|eireli|sa|s\/a|inc|llc|ltd|limited|corp|co|srl|spa|snc|lda|unipessoal|the)\b/g;

/** gera uma assinatura do nome para comparar negócios iguais */
function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "e")
    .replace(/['’`]/g, "") // apóstrofos somem: "Joe's" = "Joes"
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(SUFFIXES, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** extrai "rua + número" do endereço para diferenciar filiais */
function addrKey(address?: string): string {
  if (!address) return "";
  const a = address
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const num = a.match(/\b\d{1,6}\b/)?.[0] ?? "";
  const words = a.split(" ").filter((w) => w.length > 3).slice(0, 3).join(" ");
  return `${words} ${num}`.trim();
}

/** domínio do site, que é um identificador forte do mesmo negócio */
function siteKey(website?: string): string {
  if (!website) return "";
  try {
    return new URL(website).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** só os dígitos finais do telefone (ignora formatação e DDI) */
function phoneKey(lead: Lead): string {
  const d = (lead.phoneNational || lead.phoneIntl || "").replace(/\D/g, "");
  return d.length >= 8 ? d.slice(-8) : "";
}

/**
 * Remove empresas repetidas, mesmo vindas de buscas/cidades diferentes.
 * Considera duplicata quando bate: id, telefone, domínio do site,
 * ou (nome + endereço aproximado).
 */
export function dedupeLeads(leads: Lead[]): Lead[] {
  const out: Lead[] = [];
  const ids = new Set<string>();
  const phones = new Set<string>();
  const sites = new Set<string>();
  const names = new Set<string>();

  for (const l of leads) {
    const nk = nameKey(l.name);
    if (!nk) continue;

    const pk = phoneKey(l);
    const sk = siteKey(l.website);
    const nak = `${nk}|${addrKey(l.address)}`;

    if (ids.has(l.id)) continue;
    if (pk && phones.has(pk)) continue;
    if (sk && sites.has(sk)) continue;
    if (names.has(nak)) continue;

    ids.add(l.id);
    if (pk) phones.add(pk);
    if (sk) sites.add(sk);
    names.add(nak);
    out.push(l);
  }
  return out;
}

/** valida e normaliza um e-mail vindo das fontes */
export function cleanEmail(raw?: string): string | undefined {
  if (!raw) return undefined;
  const first = raw.split(/[;,\s]+/).find((p) => p.includes("@"));
  if (!first) return undefined;
  const e = first.replace(/^mailto:/i, "").trim().toLowerCase();
  return /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(e) ? e : undefined;
}

/* ------- redes sociais não contam como "site próprio" ------- */
const SOCIAL_RE = /facebook\.com|fb\.com|instagram\.com|wa\.me|whatsapp\.com|linktr\.ee|linktree|beacons\.ai|bio\.link/i;

export function classifyWebPresence(
  websiteRaw?: string,
  socialRaw?: { instagram?: string; facebook?: string }
): { website?: string; instagramUrl?: string; facebookUrl?: string } {
  let website: string | undefined;
  let instagramUrl: string | undefined;
  let facebookUrl: string | undefined;

  if (websiteRaw) {
    if (/instagram\.com/i.test(websiteRaw)) instagramUrl = websiteRaw;
    else if (/(facebook\.com|fb\.com)/i.test(websiteRaw)) facebookUrl = websiteRaw;
    else if (!SOCIAL_RE.test(websiteRaw)) website = websiteRaw;
  }
  const norm = (u?: string, base?: "instagram" | "facebook") =>
    !u ? undefined : /^https?:\/\//i.test(u) ? u : `https://${base}.com/${u.replace(/^@/, "")}`;

  instagramUrl = instagramUrl || norm(socialRaw?.instagram, "instagram");
  facebookUrl = facebookUrl || norm(socialRaw?.facebook, "facebook");
  return { website, instagramUrl, facebookUrl };
}

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.businessStatus",
  "places.primaryTypeDisplayName",
  "nextPageToken",
].join(",");

/* ------------------------- WhatsApp (heurística BR) ------------------------- */
/**
 * O Google não informa se o número tem WhatsApp. A melhor estimativa para o
 * Brasil é: números celulares (DDD + 9 dígitos começando com 9) costumam ter
 * WhatsApp ativo; números fixos, não.
 */
export function detectWhatsapp(
  intl?: string,
  national?: string,
  country: CountryCode = "BR",
  dial = "55"
): { status: WhatsappStatus; waLink?: string } {
  let d = (national || "").replace(/\D/g, "");
  if (!d && intl) {
    d = intl.replace(/\D/g, "");
  }
  if (!d) return { status: "sem-telefone" };

  // remove o DDI se o número já vier internacional
  if (d.startsWith(dial) && d.length > dial.length + 7) d = d.slice(dial.length);
  if (country === "GB" && d.startsWith("0")) d = d.slice(1);

  if (isMobileNumber(country, d)) {
    return { status: "provavel", waLink: `https://wa.me/${dial}${d.replace(/^0+/, "")}` };
  }
  return { status: "fixo" };
}

/* ------------------------------ Places API ------------------------------ */

interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  businessStatus?: string;
  primaryTypeDisplayName?: { text?: string };
}

export class PlacesError extends Error {
  hint?: string;
  constructor(message: string, hint?: string) {
    super(message);
    this.hint = hint;
  }
}

function parseGoogleError(payload: any, httpStatus: number): PlacesError {
  const g = payload?.error;
  const status: string = g?.status || "";
  const msg: string = g?.message || "";

  if (httpStatus === 403 || status === "PERMISSION_DENIED") {
    return new PlacesError(
      "Permissão negada pela Google Cloud.",
      "Verifique: 1) a 'Places API (New)' está ativada no projeto; 2) o faturamento está ativo; 3) a chave não tem restrição que bloqueie este serviço."
    );
  }
  if (httpStatus === 400 && /API key not valid|API_KEY_INVALID/i.test(msg)) {
    return new PlacesError("Chave de API inválida.", "Confira se a chave foi copiada por completo.");
  }
  if (status === "REQUEST_DENIED") {
    return new PlacesError(
      "Requisição negada.",
      msg || "Ative a Places API (New) no console.cloud.google.com e habilite o faturamento."
    );
  }
  if (httpStatus === 429 || status === "RESOURCE_EXHAUSTED") {
    return new PlacesError("Limite de uso excedido (quota).", "Aguarde alguns segundos e tente novamente.");
  }
  return new PlacesError(msg || `Erro ${httpStatus} ao consultar o Google Maps.`, status || undefined);
}

export interface SearchOptions {
  query: string;
  city: string;
  maxPages: 1 | 2 | 3;
  onProgress?: (page: number, total: number) => void;
}

export async function searchPlaces(apiKey: string, opts: SearchOptions): Promise<Lead[]> {
  const { query, city, maxPages, onProgress } = opts;
  const textQuery = city ? `${query} em ${city}` : query;

  const leads: Lead[] = [];
  const seen = new Set<string>();
  let pageToken: string | undefined;
  let page = 0;

  while (page < maxPages) {
    page += 1;
    onProgress?.(page, maxPages);

    const body: Record<string, unknown> = {
      textQuery,
      languageCode: "pt-BR",
      regionCode: "BR",
      pageSize: 20,
      ...(pageToken ? { pageToken } : {}),
    };

    let res: Response;
    try {
      res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new PlacesError(
        "Falha de rede ao contatar o Google.",
        "Pode ser bloqueio de CORS/rede. Gere a chave sem restrições de referrer (ou autorize este domínio) e tente novamente."
      );
    }

    if (!res.ok) {
      let payload: any = null;
      try {
        payload = await res.json();
      } catch {
        /* ignore */
      }
      throw parseGoogleError(payload, res.status);
    }

    const data: { places?: RawPlace[]; nextPageToken?: string } = await res.json();

    for (const p of data.places ?? []) {
      if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue;
      const id = p.id || `${p.displayName?.text}-${p.formattedAddress}`;
      if (seen.has(id)) continue;
      seen.add(id);

      const wa = detectWhatsapp(p.internationalPhoneNumber, p.nationalPhoneNumber);
      const wp = classifyWebPresence(p.websiteUri?.trim());
      leads.push({
        id,
        name: p.displayName?.text || "Sem nome",
        address: p.formattedAddress,
        phoneNational: p.nationalPhoneNumber,
        phoneIntl: p.internationalPhoneNumber,
        website: wp.website,
        instagramUrl: wp.instagramUrl,
        facebookUrl: wp.facebookUrl,
        rating: p.rating,
        ratingCount: p.userRatingCount,
        mapsUrl: p.googleMapsUri,
        primaryType: p.primaryTypeDisplayName?.text,
        hasSite: Boolean(wp.website),
        hasEmail: false,
        hasSocial: Boolean(wp.instagramUrl || wp.facebookUrl),
        whatsapp: wa.status,
        waLink: wa.waLink,
        source: "gmaps",
      });
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
    // pequena pausa garante que o token da próxima página já esteja ativo
    await new Promise((r) => setTimeout(r, 700));
  }

  return leads;
}

/* ------------------------------ filtros ------------------------------ */

export function filterLeads(
  leads: Lead[],
  site: SiteFilter,
  wa: WaFilter,
  email: EmailFilter = "todos",
  social: SocialFilter = "todos"
): Lead[] {
  return dedupeLeads(leads)
    .filter((l) => {
      if (site === "sem" && l.hasSite) return false;
      if (site === "com" && !l.hasSite) return false;
      if (wa === "com" && l.whatsapp !== "provavel") return false;
      if (wa === "sem" && l.whatsapp === "provavel") return false;
      if (email === "com" && !l.hasEmail) return false;
      if (email === "sem" && l.hasEmail) return false;
      if (social === "com" && !l.hasSocial) return false;
      if (social === "sem" && l.hasSocial) return false;
      return true;
    })
    .sort((a, b) => {
      // oportunidades (sem site) primeiro
      if (a.hasSite !== b.hasSite) return a.hasSite ? 1 : -1;
      // depois quem tem mais formas de contato (mais fácil abordar)
      const score = (l: Lead) =>
        (l.whatsapp === "provavel" ? 2 : 0) + (l.hasEmail ? 2 : 0) + (l.hasSocial ? 1 : 0);
      const diff = score(b) - score(a);
      if (diff !== 0) return diff;
      return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
    });
}

/* ------------------------------ CSV ------------------------------ */

export function leadsToCsv(leads: Lead[]): string {
  const esc = (v?: string | number | null) => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = [
    "nome",
    "telefone",
    "whatsapp_aparente",
    "email",
    "tem_site",
    "site",
    "instagram",
    "facebook",
    "avaliacao",
    "qtd_avaliacoes",
    "endereco",
    "mapa",
  ];
  const rows = leads.map((l) =>
    [
      esc(l.name),
      esc(l.phoneNational || l.phoneIntl || ""),
      l.whatsapp === "provavel" ? "sim" : l.whatsapp === "fixo" ? "nao (fixo)" : "sem telefone",
      esc(l.email || ""),
      l.hasSite ? "sim" : "nao",
      esc(l.website || ""),
      esc(l.instagramUrl || ""),
      esc(l.facebookUrl || ""),
      esc(l.rating),
      esc(l.ratingCount),
      esc(l.address || ""),
      esc(l.mapsUrl || ""),
    ].join(";")
  );
  return "\uFEFF" + [header.join(";"), ...rows].join("\n");
}

export function downloadCsv(leads: Lead[], filename: string) {
  const blob = new Blob([leadsToCsv(leads)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

