import type { Area } from '../types';
import { ErroServico, getJson } from './http';

const URL_BRASILAPI = 'https://brasilapi.com.br/api/cep/v2';
const URL_VIACEP = 'https://viacep.com.br/ws';

/** Só os 8 dígitos, ou null se o CEP não for válido. */
export function normalizarCep(valor: string): string | null {
  const digitos = valor.replace(/\D/g, '');
  return digitos.length === 8 ? digitos : null;
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

/** Aceita número ou texto; vazio, "0" e inválido viram undefined. */
function coordenada(valor: unknown): number | undefined {
  if (valor === null || valor === undefined || valor === '') return undefined;
  const n = typeof valor === 'number' ? valor : Number(String(valor).trim().replace(',', '.'));
  return Number.isFinite(n) && n !== 0 ? n : undefined;
}

function codigoIbge(valor: unknown): string {
  const digitos = String(valor ?? '').replace(/\D/g, '');
  return digitos.length === 7 ? digitos : '';
}

function montarNome(bairro: string, cidade: string): string {
  if (bairro && cidade) return `${bairro}, ${cidade}`;
  return bairro || cidade || 'Área sem nome';
}

interface Parcial {
  area: Area;
  /** O BrasilAPI às vezes não traz o código IBGE. */
  faltaCodigo: boolean;
}

function lerBrasilApi(json: unknown): Parcial {
  const j = (json ?? {}) as Record<string, any>;
  const ibge = j.ibge;
  const codigo = codigoIbge(typeof ibge === 'object' && ibge !== null ? (ibge.city ?? ibge.codigo) : ibge);
  const coords = j.location?.coordinates ?? {};
  const area: Area = { nome: montarNome(texto(j.neighborhood), texto(j.city)), codigoIbge: codigo };
  const latitude = coordenada(coords.latitude);
  const longitude = coordenada(coords.longitude);
  if (latitude !== undefined && longitude !== undefined) {
    area.latitude = latitude;
    area.longitude = longitude;
  }
  return { area, faltaCodigo: codigo === '' };
}

function lerViaCep(json: unknown): Area {
  const j = (json ?? {}) as Record<string, any>;
  if (j.erro === true || String(j.erro).toLowerCase() === 'true') {
    throw new ErroServico('nao_encontrado', 'CEP não encontrado');
  }
  const codigo = codigoIbge(j.ibge);
  if (!codigo) throw new ErroServico('resposta_invalida', 'ViaCEP sem código IBGE');
  return { nome: montarNome(texto(j.bairro), texto(j.localidade)), codigoIbge: codigo };
}

/**
 * Descobre a área (nome, código IBGE e, se houver, coordenadas) a partir do CEP.
 * Tenta o BrasilAPI e, se falhar, o ViaCEP (que não traz coordenadas).
 */
export async function buscarAreaPorCep(cep: string): Promise<Area> {
  const limpo = normalizarCep(cep);
  if (!limpo) throw new ErroServico('nao_encontrado', 'CEP deve ter 8 números');

  let brasilapi: Parcial | null = null;
  try {
    brasilapi = lerBrasilApi(await getJson<unknown>(`${URL_BRASILAPI}/${limpo}`));
    if (!brasilapi.faltaCodigo) return brasilapi.area;
  } catch {
    // cai no ViaCEP
  }

  const viacep = lerViaCep(await getJson<unknown>(`${URL_VIACEP}/${limpo}/json/`));
  if (!brasilapi) return viacep;
  return { ...brasilapi.area, codigoIbge: viacep.codigoIbge };
}
