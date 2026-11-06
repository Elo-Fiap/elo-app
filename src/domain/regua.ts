import type { LeituraRegua } from '../types';
import { formatarMetros } from './formatar';

export function acimaDoLimite(nivelMetros: number, limiteMetros: number): boolean {
  return nivelMetros >= limiteMetros;
}

/** "1,42 m, limite 1,20 m". */
export function textoRegua(leitura: Pick<LeituraRegua, 'nivelMetros' | 'limiteMetros'>): string {
  return `${formatarMetros(leitura.nivelMetros)}, limite ${formatarMetros(leitura.limiteMetros)}`;
}
