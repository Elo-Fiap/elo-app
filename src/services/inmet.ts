import { config } from '../config';
import { avisosDeExemplo } from '../mocks/inmet';
import type { Aviso, SeveridadeAviso } from '../types';
import { getJson } from './http';
import { converterListaPython } from './listaPython';

export const URL_AVISOS_ATIVOS = 'https://apiprevmet3.inmet.gov.br/avisos/ativos';

// A resposta real tem ~580 KB (polígonos e ícones). Em rede ruim, damos mais tempo.
const TIMEOUT_INMET_MS = 20_000;

const GRAVIDADE: Record<SeveridadeAviso, 1 | 2 | 3> = {
  'Perigo Potencial': 1,
  Perigo: 2,
  'Grande Perigo': 3,
};

function lerSeveridade(valor: unknown): SeveridadeAviso {
  const texto = String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
  if (texto === 'grande perigo') return 'Grande Perigo';
  if (texto === 'perigo') return 'Perigo';
  return 'Perigo Potencial';
}

/** "2026-11-05 00:01" (horário de Brasília, sem fuso) vira "2026-11-05T00:01:00-03:00". */
function paraIso(valor: unknown): string {
  const texto = String(valor ?? '').trim();
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(texto);
  return m ? `${m[1]}T${m[2]}:00-03:00` : texto;
}

function estaEncerrado(valor: unknown): boolean {
  return valor === true || String(valor ?? '').trim().toLowerCase() === 'true';
}

function cobreArea(geocodes: unknown, codigoIbge: string): boolean {
  if (typeof geocodes !== 'string') return false;
  return geocodes.split(',').some((codigo) => codigo.trim() === codigoIbge);
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function normalizarLista(lista: unknown, quando: Aviso['quando'], codigoIbge: string): Aviso[] {
  if (!Array.isArray(lista)) return [];
  const avisos: Aviso[] = [];
  for (const item of lista) {
    if (!ehObjeto(item)) continue;
    if (estaEncerrado(item.encerrado)) continue;
    if (!cobreArea(item.geocodes, codigoIbge)) continue;
    const severidade = lerSeveridade(item.severidade);
    avisos.push({
      id: String(item.id ?? ''),
      titulo: String(item.descricao ?? 'Aviso').trim(),
      severidade,
      gravidade: GRAVIDADE[severidade],
      inicio: paraIso(item.inicio),
      fim: paraIso(item.fim),
      quando,
      riscos: converterListaPython(item.riscos),
      instrucoes: converterListaPython(item.instrucoes),
    });
  }
  return avisos;
}

function instante(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Transforma a resposta do INMET nos avisos que valem para a área.
 * Compara o código IBGE inteiro (3550308 não casa com 355030), ignora encerrados,
 * descarta polígono e ícone, e ordena do mais grave ao mais leve (depois por início).
 */
export function normalizarAvisos(json: unknown, codigoIbge: string): Aviso[] {
  if (!ehObjeto(json)) return [];
  const codigo = codigoIbge.trim();
  const todos = [
    ...normalizarLista(json.hoje, 'hoje', codigo),
    ...normalizarLista(json.futuro, 'futuro', codigo),
  ];
  const vistos = new Set<string>();
  return todos
    .filter((a) => (vistos.has(a.id) ? false : (vistos.add(a.id), true)))
    .sort((a, b) => b.gravidade - a.gravidade || instante(a.inicio) - instante(b.inicio));
}

export async function buscarAvisos(codigoIbge: string, agora: Date = new Date()): Promise<Aviso[]> {
  const json = config.usarMock
    ? avisosDeExemplo(codigoIbge, agora)
    : await getJson<unknown>(URL_AVISOS_ATIVOS, { timeoutMs: TIMEOUT_INMET_MS });
  return normalizarAvisos(json, codigoIbge);
}
