/* ------------------------------------------------------------------ */
/*  Localidades do Brasil — IBGE (API pública e gratuita)              */
/*  https://servicodados.ibge.gov.br/api/docs/localidades              */
/* ------------------------------------------------------------------ */

export interface UF {
  sigla: string;
  nome: string;
}

export const UFS: UF[] = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
];

export const ufNome = (sigla: string): string => UFS.find((u) => u.sigla === sigla)?.nome || sigla;

const memCache = new Map<string, string[]>();

export async function fetchCities(sigla: string): Promise<string[]> {
  const hit = memCache.get(sigla);
  if (hit) return hit;

  try {
    const ls = localStorage.getItem(`rl_cities_${sigla}`);
    if (ls) {
      const arr = JSON.parse(ls);
      if (Array.isArray(arr) && arr.length > 0) {
        memCache.set(sigla, arr);
        return arr;
      }
    }
  } catch {
    /* sem cache */
  }

  const res = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${sigla}/municipios?orderBy=nome`
  );
  if (!res.ok) throw new Error(`IBGE respondeu ${res.status}`);

  const data: { nome: string }[] = await res.json();
  const arr = data.map((d) => d.nome).filter(Boolean);
  memCache.set(sigla, arr);
  try {
    localStorage.setItem(`rl_cities_${sigla}`, JSON.stringify(arr));
  } catch {
    /* cache cheio: sem problema */
  }
  return arr;
}
