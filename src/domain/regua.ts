import type { LeituraRegua } from '../types';
import { formatarMetros, horaComH, quandoSalvo } from './formatar';

// Os mesmos intervalos do ESP32 no contrato (docs/contrato-api.md).
export const INTERVALO_REGUA_MS = 30_000;
export const INTERVALO_REGUA_ACIMA_MS = 10_000;

/** A régua publica a cada 30 s: 5 minutos sem leitura nova já é sinal de que parou. */
export const LEITURA_ANTIGA_MS = 5 * 60_000;

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

/** De quanto em quanto tempo a tela busca a régua de novo. */
export function intervaloDaRegua(leitura?: Pick<LeituraRegua, 'nivelMetros' | 'limiteMetros'>): number {
  return leitura && acimaDoLimite(leitura.nivelMetros, leitura.limiteMetros)
    ? INTERVALO_REGUA_ACIMA_MS
    : INTERVALO_REGUA_MS;
}

/** Sem data válida, não dá para afirmar que a leitura é de agora. */
export function leituraAntiga(medidaEm: string, agora: Date): boolean {
  const medida = Date.parse(medidaEm);
  return Number.isNaN(medida) || agora.getTime() - medida > LEITURA_ANTIGA_MS;
}

/** Valor da linha "Régua": leitura antiga diz de quando é, no lugar do limite. */
export function valorDaLeitura(leitura: LeituraRegua, agora: Date): string {
  if (!leituraAntiga(leitura.medidaEm, agora)) return textoRegua(leitura);
  const nivel = formatarMetros(leitura.nivelMetros);
  const quando = quandoSalvo(leitura.medidaEm, agora, horaComH);
  return quando ? `${nivel}, medida ${quando}` : `${nivel}, sem hora da medida`;
}

export interface AvisoDaRegua {
  titulo: string;
  apoio: string;
  /** Leitura de agora e de sensor de verdade: só nesse caso o celular vibra. */
  urgente: boolean;
}

/**
 * Aviso da aba Agora. Null abaixo do limite. É leitura do sensor no local, não alerta oficial.
 * Leitura antiga continua aparecendo, porque o sensor pode ter parado no pior momento,
 * mas o texto diz que ela não é de agora.
 */
export function avisoDaRegua(leitura: LeituraRegua, agora: Date, exemplo: boolean): AvisoDaRegua | null {
  if (!acimaDoLimite(leitura.nivelMetros, leitura.limiteMetros)) return null;

  const antiga = leituraAntiga(leitura.medidaEm, agora);
  const quando = quandoSalvo(leitura.medidaEm, agora, horaComH);
  const frase = antiga ? 'última medida da régua acima do limite' : 'régua acima do limite';
  const apoio = [
    `${textoRegua(leitura)}.`,
    leitura.local ? `${leitura.local}.` : '',
    quando ? `Medida ${quando}.` : '',
    antiga ? 'Sem leitura nova desde então.' : '',
    exemplo ? 'Leitura de exemplo, inventada.' : '',
  ];

  return {
    titulo: exemplo ? `Exemplo: ${frase}` : frase.charAt(0).toUpperCase() + frase.slice(1),
    apoio: apoio.filter(Boolean).join(' '),
    urgente: !antiga && !exemplo,
  };
}
