import type { Area } from './types';

// O Expo troca process.env.EXPO_PUBLIC_* na hora de empacotar, mas só quando
// o nome aparece escrito por inteiro, por isso não dá para usar process.env[nome].
const usarMockEnv = process.env.EXPO_PUBLIC_USE_MOCK;
const apiUrlEnv = process.env.EXPO_PUBLIC_API_URL;

export const AREA_PADRAO: Area = {
  nome: 'Área de exemplo, São Paulo',
  codigoIbge: '3550308',
  latitude: -23.5475,
  longitude: -46.63611,
};

/** Objeto mutável de propósito: os testes ajustam os valores. */
export const config = {
  /** true força dados de exemplo em tudo (INMET, Open-Meteo e API do bairro). */
  usarMock: (usarMockEnv ?? '').trim().toLowerCase() === 'true',
  /** Sem barra no final. Vazio: a API do bairro usa os dados de exemplo. */
  apiUrl: (apiUrlEnv ?? '').trim().replace(/\/+$/, ''),
  areaPadrao: AREA_PADRAO,
  /** Janela da chamada: quanto tempo as ruas têm para responder. */
  janelaMinutos: 15,
  /** Quanto tempo as chamadas ficam guardadas no aparelho. */
  diasDeHistorico: 30,
};

/** A API do bairro só é chamada com URL definida e sem o modo de exemplo. */
export function usaApiDoBairro(): boolean {
  return !config.usarMock && config.apiUrl !== '';
}

/** Aviso para telas que mostram dado inventado. Null com a API real. */
export function avisoDeExemplo(): string | null {
  if (config.usarMock) return 'Modo de exemplo: avisos, chuva e ruas são inventados.';
  if (!usaApiDoBairro()) return 'Ruas e números de exemplo, inventados.';
  return null;
}
