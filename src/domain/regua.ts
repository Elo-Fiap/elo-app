import type { LeituraRegua } from '../types';
import { formatarMetros } from './formatar';

export function acimaDoLimite(nivelMetros: number, limiteMetros: number): boolean {
  return nivelMetros >= limiteMetros;
}

/** Atenção só existe se a API mandou `atencaoMetros`. Acima do limite vale mais que atenção. */
export function emAtencao(leitura: Pick<LeituraRegua, 'nivelMetros' | 'limiteMetros' | 'atencaoMetros'>): boolean {
  if (leitura.atencaoMetros === undefined) return false;
  return !acimaDoLimite(leitura.nivelMetros, leitura.limiteMetros) && leitura.nivelMetros >= leitura.atencaoMetros;
}

/** "1,42 m, limite 1,20 m". */
export function textoRegua(leitura: Pick<LeituraRegua, 'nivelMetros' | 'limiteMetros'>): string {
  return `${formatarMetros(leitura.nivelMetros)}, limite ${formatarMetros(leitura.limiteMetros)}`;
}
