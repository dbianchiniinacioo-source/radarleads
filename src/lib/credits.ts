/* ------------------------------------------------------------------ */
/*  Medição de créditos                                                 */
/*                                                                      */
/*  IMPORTANTE: a Geoapify NÃO expõe endpoint público de consumo        */
/*  (testado: /v1/account/usage e afins respondem 401 para qualquer     */
/*  caminho). O número real só aparece em myprojects.geoapify.com.      */
/*  Por isso medimos cada chamada aplicando a fórmula oficial da doc    */
/*  e oferecemos sincronia manual com o painel.                         */
/*                                                                      */
/*  Fórmula oficial (geoapify.com/places-api — "Pricing Details"):      */
/*    1 crédito pela requisição + 1 crédito a cada 20 lugares           */
/*    além dos 20 primeiros.                                            */
/*    ex.: 50 lugares → 1 + ceil(30/20) = 3 créditos                    */
/*    ex.: 120 lugares → 1 + ceil(100/20) = 6 créditos                  */
/* ------------------------------------------------------------------ */

import type { LeadSource } from "./places";

export const DAILY_LIMIT: Record<LeadSource, number | null> = {
  geoapify: 3000,
  gmaps: null, // depende do plano do usuário
  osm: null, // sem limite de conta
};

/** calcula o custo exato de UMA chamada, conforme a doc */
export function creditsForCall(source: LeadSource, places: number): number {
  if (source !== "geoapify") return 1;
  if (places <= 20) return 1;
  return 1 + Math.ceil((places - 20) / 20);
}

export interface CallLog {
  at: number;
  label: string;
  places: number;
  credits: number;
}

export interface Usage {
  day: string; // AAAA-MM-DD
  credits: number; // créditos medidos hoje
  requests: number; // chamadas feitas hoje
  delivered: number; // leads entregues hoje
  places: number; // lugares analisados hoje
  /** ajuste manual: diferença entre o painel real e nossa medição */
  offset: number;
  /** quando o usuário sincronizou com o painel pela última vez */
  syncedAt?: number;
  /** últimas chamadas, para o detalhamento */
  log: CallLog[];
}

const today = () => new Date().toISOString().slice(0, 10);
const key = (source: LeadSource) => `rl_usage_${source}`;
const MAX_LOG = 40;

const empty = (): Usage => ({
  day: today(),
  credits: 0,
  requests: 0,
  delivered: 0,
  places: 0,
  offset: 0,
  log: [],
});

export function readUsage(source: LeadSource): Usage {
  try {
    const raw = localStorage.getItem(key(source));
    if (!raw) return empty();
    const u = JSON.parse(raw) as Partial<Usage>;
    if (!u || u.day !== today()) return empty(); // virou o dia → zera
    return {
      day: u.day,
      credits: u.credits || 0,
      requests: u.requests || 0,
      delivered: u.delivered || 0,
      places: u.places || 0,
      offset: u.offset || 0,
      syncedAt: u.syncedAt,
      log: Array.isArray(u.log) ? u.log : [],
    };
  } catch {
    return empty();
  }
}

function write(source: LeadSource, u: Usage) {
  try {
    localStorage.setItem(key(source), JSON.stringify(u));
  } catch {
    /* storage cheio */
  }
}

/** registra UMA chamada à API, medindo o custo exato */
export function addUsage(source: LeadSource, places = 0, label = "busca"): Usage {
  const u = readUsage(source);
  const credits = creditsForCall(source, places);
  const next: Usage = {
    ...u,
    credits: u.credits + credits,
    requests: u.requests + 1,
    places: u.places + places,
    log: [{ at: Date.now(), label, places, credits }, ...u.log].slice(0, MAX_LOG),
  };
  write(source, next);
  return next;
}

/** registra quantos leads foram entregues de fato */
export function addDelivered(source: LeadSource, n: number): Usage {
  const u = readUsage(source);
  const next: Usage = { ...u, delivered: u.delivered + n };
  write(source, next);
  return next;
}

/** calibra com o número real do painel da Geoapify */
export function syncWithDashboard(source: LeadSource, realCredits: number): Usage {
  const u = readUsage(source);
  const next: Usage = {
    ...u,
    offset: Math.max(0, Math.round(realCredits)) - u.credits,
    syncedAt: Date.now(),
  };
  write(source, next);
  return next;
}

export function resetUsage(source: LeadSource): Usage {
  const fresh = empty();
  write(source, fresh);
  return fresh;
}

/** total considerando o ajuste manual */
export const totalCredits = (u: Usage): number => Math.max(0, u.credits + u.offset);

/** quanto resta hoje (null = sem limite conhecido) */
export function remaining(source: LeadSource, u: Usage): number | null {
  const limit = DAILY_LIMIT[source];
  return limit === null ? null : Math.max(0, limit - totalCredits(u));
}

/** horas até o limite reiniciar (meia-noite UTC) */
export function hoursUntilReset(): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return Math.max(1, Math.round((next.getTime() - now.getTime()) / 3600_000));
}
