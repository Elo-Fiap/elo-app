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

/** Relógio do celular adiantado até aqui não atrapalha: a medida ainda conta como de agora. */
export const FUTURO_TOLERADO_MS = 2 * 60_000;

/** Vibra no máximo uma vez nesse intervalo, mesmo com o nível oscilando em volta do limite. */
export const INTERVALO_VIBRACAO_MS = 5 * 60_000;

/**
 * A medida está tão à frente do celular que um dos dois relógios está errado.
 * Não dá para saber se a leitura é de agora: não vale como urgente.
 */
export function horaNaoConfere(medidaEm: string, agora: Date): boolean {
  const medida = Date.parse(medidaEm);
  return !Number.isNaN(medida) && medida - agora.getTime() > FUTURO_TOLERADO_MS;
}

/**
 * Sem data válida, ou com a hora fora do que o celular marca, não dá para afirmar que a leitura é de agora.
 * Medida até 2 minutos à frente do celular é tolerada e conta como de agora.
 */
export function leituraAntiga(medidaEm: string, agora: Date): boolean {
  const medida = Date.parse(medidaEm);
  if (Number.isNaN(medida)) return true;
  return agora.getTime() - medida > LEITURA_ANTIGA_MS || horaNaoConfere(medidaEm, agora);
}

export const TEXTO_HORA_NAO_CONFERE = 'A hora da medida não confere com a do celular.';

/** "Medida às 10h00." ou o aviso de que a hora não confere. Vazio se a data não vale. */
export function notaDaMedida(medidaEm: string, agora: Date): string {
  if (horaNaoConfere(medidaEm, agora)) return TEXTO_HORA_NAO_CONFERE;
  const quando = quandoSalvo(medidaEm, agora, horaComH);
  return quando ? `Medida ${quando}.` : '';
}

/**
 * Valor da linha "Régua", igual nas abas Agora e Bairro.
 * Leitura de agora mostra nível e limite; a antiga diz de quando é, no lugar do limite.
 */
export function valorDaRegua(leitura: LeituraRegua | undefined, falhou: boolean, agora: Date): string {
  if (!leitura) return falhou ? 'Sem leitura agora' : 'Buscando…';
  const nivel = formatarMetros(leitura.nivelMetros);
  if (horaNaoConfere(leitura.medidaEm, agora)) return `${nivel}, hora da medida não confere`;
  if (leituraAntiga(leitura.medidaEm, agora)) {
    const quando = quandoSalvo(leitura.medidaEm, agora, horaComH);
    return quando ? `${nivel}, medida ${quando}` : `${nivel}, sem hora da medida`;
  }
  if (acimaDoLimite(leitura.nivelMetros, leitura.limiteMetros)) return `${textoRegua(leitura)}, acima do limite`;
  return emAtencao(leitura) ? `${textoRegua(leitura)}, em atenção` : textoRegua(leitura);
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
 * mas o texto diz que ela não é de agora. Com a hora que não confere, não é urgente.
 */
export function avisoDaRegua(leitura: LeituraRegua, agora: Date, exemplo: boolean): AvisoDaRegua | null {
  if (!acimaDoLimite(leitura.nivelMetros, leitura.limiteMetros)) return null;

  const naoConfere = horaNaoConfere(leitura.medidaEm, agora);
  const antiga = leituraAntiga(leitura.medidaEm, agora) && !naoConfere;
  const frase = antiga ? 'última medida da régua acima do limite' : 'régua acima do limite';
  const apoio = [
    `${textoRegua(leitura)}.`,
    leitura.local ? `${leitura.local}.` : '',
    notaDaMedida(leitura.medidaEm, agora),
    antiga ? 'Sem leitura nova desde então.' : '',
    exemplo ? 'Leitura de exemplo, inventada.' : '',
  ];

  return {
    titulo: exemplo ? `Exemplo: ${frase}` : frase.charAt(0).toUpperCase() + frase.slice(1),
    apoio: apoio.filter(Boolean).join(' '),
    urgente: !leituraAntiga(leitura.medidaEm, agora) && !exemplo,
  };
}

/** O que a tela guarda entre uma leitura e outra para decidir se anuncia e vibra. */
export interface EstadoDoAnuncio {
  /** `medidaEm` da última leitura já tratada. */
  medidaEm: string | null;
  /** Título do aviso que estava na tela; null se não havia aviso. */
  titulo: string | null;
  /** Instante (ms) da última vibração. */
  vibrouEm: number | null;
}

export const ANUNCIO_INICIAL: EstadoDoAnuncio = { medidaEm: null, titulo: null, vibrouEm: null };

export interface DecisaoDoAnuncio {
  anunciar: boolean;
  vibrar: boolean;
  proximo: EstadoDoAnuncio;
}

/**
 * Decide se o aviso da régua é anunciado e se o celular vibra.
 * - Com a busca em andamento ou sem leitura, nada acontece e o estado fica como está.
 * - A leitura que passa de "atual" para "antiga" só pelo tempo muda o texto, sem anunciar nem vibrar.
 * - Vibra só com leitura nova, urgente, e no máximo uma vez a cada 5 minutos.
 * - Anuncia quando o aviso aparece, ou quando chega leitura nova que muda o título.
 */
export function decidirAnuncio(
  anterior: EstadoDoAnuncio,
  atual: { medidaEm: string; aviso: AvisoDaRegua | null } | null,
  buscando: boolean,
  agoraMs: number,
): DecisaoDoAnuncio {
  if (buscando || !atual) return { anunciar: false, vibrar: false, proximo: anterior };

  const { aviso } = atual;
  const titulo = aviso?.titulo ?? null;
  const leituraNova = atual.medidaEm !== anterior.medidaEm;
  const apareceu = titulo !== null && anterior.titulo === null;
  const tituloMudou = titulo !== anterior.titulo;
  const livre = anterior.vibrouEm === null || agoraMs - anterior.vibrouEm >= INTERVALO_VIBRACAO_MS;

  const anunciar = titulo !== null && (apareceu || (leituraNova && tituloMudou));
  const vibrar = leituraNova && aviso?.urgente === true && livre;

  return {
    anunciar,
    vibrar,
    proximo: { medidaEm: atual.medidaEm, titulo, vibrouEm: vibrar ? agoraMs : anterior.vibrouEm },
  };
}
