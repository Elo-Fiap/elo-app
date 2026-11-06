import { lerCache } from '../db/cache';
import { listar } from '../db/chamadas';
import { juntarChamadasLocais } from '../domain/chamada';
import type {
  Area,
  Aviso,
  Chamada,
  Distrito,
  LeituraRegua,
  PlanoRua,
  PrevisaoChuva,
  Rua,
  SituacaoBairro,
} from '../types';
import { buscarLeituraRegua, buscarPlanoRua, buscarSituacaoBairro } from './bairro';
import { comCache, type ResultadoComCache } from './comCache';
import { buscarDistritos } from './ibge';
import { buscarAvisos } from './inmet';
import { buscarHorasDePrevisao, resumirProximasHoras } from './openMeteo';

// Consultas que as telas usam: rede primeiro, último dado salvo se a rede falhar.
// Toda chave de cache nasce aqui, para não haver duas telas com chaves diferentes.

const chaveDosAvisos = (area: Area) => `avisos:${area.codigoIbge}`;
const semAvisosVencidos = (avisos: Aviso[], agora: Date) =>
  avisos.filter((a) => !(Date.parse(a.fim) < agora.getTime()));

/** Sem internet, o cache pode trazer aviso que já acabou: esse sai da lista. */
export async function consultarAvisos(area: Area, agora: Date = new Date()): Promise<ResultadoComCache<Aviso[]>> {
  const r = await comCache(chaveDosAvisos(area), () => buscarAvisos(area.codigoIbge, agora));
  return { ...r, dados: semAvisosVencidos(r.dados, agora) };
}

/**
 * Só o que já está salvo no aparelho, sem rede: a tela de detalhe não baixa de novo
 * os avisos do INMET (cerca de 580 KB). Null se não há nada salvo ou o banco falhou.
 */
export async function avisosGuardados(
  area: Area,
  agora: Date = new Date(),
): Promise<ResultadoComCache<Aviso[]> | null> {
  try {
    const guardado = await lerCache<Aviso[]>(chaveDosAvisos(area));
    if (!guardado || !Array.isArray(guardado.valor)) return null;
    return { dados: semAvisosVencidos(guardado.valor, agora), origem: 'cache', salvoEm: guardado.salvoEm };
  } catch {
    return null;
  }
}

/** O cache guarda as horas da previsão, não o resumo: sem internet, "próximas 3 horas" é refeito para a hora atual. */
export async function consultarPrevisao(area: Area, agora: Date = new Date()): Promise<ResultadoComCache<PrevisaoChuva>> {
  const r = await comCache(`previsao:${area.latitude},${area.longitude}`, () => buscarHorasDePrevisao(area, agora));
  return { ...r, dados: resumirProximasHoras(r.dados, agora) };
}

export function consultarSituacao(): Promise<ResultadoComCache<SituacaoBairro>> {
  return comCache('situacao', () => buscarSituacaoBairro());
}

/** Situação do servidor mais as chamadas feitas neste celular que o servidor ainda não mostra. */
export async function consultarSituacaoComLocais(): Promise<ResultadoComCache<SituacaoBairro>> {
  const resultado = await consultarSituacao();
  let locais: Chamada[] = [];
  try {
    locais = await listar();
  } catch {
    // Sem histórico local, vale só o que o servidor mostra.
  }
  return { ...resultado, dados: juntarChamadasLocais(resultado.dados, locais) };
}

export function consultarRegua(): Promise<ResultadoComCache<LeituraRegua>> {
  return comCache('regua', () => buscarLeituraRegua());
}

export function consultarPlano(ruaId: string): Promise<ResultadoComCache<PlanoRua>> {
  return comCache(`plano:${ruaId}`, () => buscarPlanoRua(ruaId));
}

export function consultarDistritos(codigoIbge: string): Promise<ResultadoComCache<Distrito[]>> {
  return comCache(`distritos:${codigoIbge}`, () => buscarDistritos(codigoIbge));
}

/**
 * Guarda no aparelho o plano de cada rua enquanto há internet, para o plano
 * abrir depois sem sinal. Rua sem plano ou falha de rede não atrapalham as outras.
 */
export async function guardarPlanosParaOffline(ruas: readonly Pick<Rua, 'id'>[]): Promise<void> {
  await Promise.allSettled(ruas.map((rua) => consultarPlano(rua.id)));
}
