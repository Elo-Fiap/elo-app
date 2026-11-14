import { Linking, Platform } from 'react-native';

import type { Rua } from '../types';

type RuaComPosicao = Pick<Rua, 'nome' | 'latitude' | 'longitude'>;

/** A rua só tem "Ver no mapa" se a API mandou as duas coordenadas. */
export function temPosicao(rua: RuaComPosicao): rua is RuaComPosicao & { latitude: number; longitude: number } {
  return typeof rua.latitude === 'number' && typeof rua.longitude === 'number';
}

/**
 * Endereço que abre o app de mapas do aparelho.
 * iOS: `maps:?ll=lat,lon&q=nome`. Android: `geo:lat,lon?q=lat,lon(nome)`.
 */
export function urlDoMapa(rua: RuaComPosicao, sistema: string = Platform.OS): string | null {
  if (!temPosicao(rua)) return null;
  const ponto = `${rua.latitude},${rua.longitude}`;
  const nome = encodeURIComponent(rua.nome);
  return sistema === 'ios' ? `maps:?ll=${ponto}&q=${nome}` : `geo:${ponto}?q=${ponto}(${nome})`;
}

/** Abre o app de mapas na rua. Devolve false se a rua não tem posição ou o aparelho não abriu. */
export async function abrirNoMapa(rua: RuaComPosicao): Promise<boolean> {
  const endereco = urlDoMapa(rua);
  if (endereco === null) return false;
  try {
    await Linking.openURL(endereco);
    return true;
  } catch {
    return false;
  }
}
