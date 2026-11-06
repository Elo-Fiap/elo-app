import type { Area, Aviso, PrevisaoChuva } from '../types';
import { ateQuando, dataHoraCurta, formatarMilimetros, quandoSalvo } from './formatar';

interface Opcoes {
  /** Quando os dados foram salvos, se vieram do celular em vez da internet. */
  salvoEm?: string | null;
  /** Dados fictícios: a mensagem precisa dizer isso, porque vai para um grupo de verdade. */
  exemplo?: boolean;
}

/**
 * Texto do aviso para a liderança colar no grupo de WhatsApp do bairro.
 * `avisos` null = não deu para consultar; isso nunca pode virar "nenhum aviso".
 * Sempre termina com 199 e 193.
 */
export function montarTextoAviso(
  area: Pick<Area, 'nome'>,
  avisos: readonly Aviso[] | null,
  previsao: PrevisaoChuva | null,
  { salvoEm = null, exemplo = false }: Opcoes = {},
): string {
  const linhas = [`*Elo* - ${area.nome}`];
  if (exemplo) linhas.unshift('*EXEMPLO: não é um aviso real*');
  if (salvoEm) linhas.push(`Dados salvos ${quandoSalvo(salvoEm)}, podem estar desatualizados.`);
  if (avisos === null) {
    linhas.push('Não foi possível consultar os avisos do INMET agora. Confira com a Defesa Civil.');
  } else if (avisos.length === 0) {
    linhas.push('Nenhum aviso do INMET para a área agora.');
  } else {
    for (const aviso of avisos) {
      linhas.push(
        `*${aviso.titulo}* (${aviso.severidade}), de ${dataHoraCurta(aviso.inicio)} até ${dataHoraCurta(aviso.fim)}.`,
      );
    }
    const instrucao = avisos[0].instrucoes[0];
    if (instrucao) linhas.push(instrucao);
  }
  if (previsao && previsao.horas > 0) {
    linhas.push(
      `Chuva prevista nas próximas ${previsao.horas} horas: ${formatarMilimetros(previsao.totalMm)} mm, chance de até ${previsao.chanceMaxima}%.`,
    );
  }
  linhas.push('', 'Em perigo, ligue: Defesa Civil 199 ou Bombeiros 193.');
  return linhas.join('\n');
}

/** Quem vale hoje antes dos futuros; dentro disso, a maior gravidade primeiro. Não altera a lista. */
export function ordenarAvisos(avisos: readonly Aviso[]): Aviso[] {
  const grupo = (a: Aviso) => (a.quando === 'hoje' ? 0 : 1);
  return [...avisos].sort((a, b) => grupo(a) - grupo(b) || b.gravidade - a.gravidade);
}

/** "Tempestade, Perigo, até 23h59". */
export function linhaDoAviso(aviso: Aviso, agora: Date = new Date()): string {
  return [aviso.titulo, aviso.severidade, ateQuando(aviso.fim, agora)].filter((p) => p !== '').join(', ');
}

/** `null` = não deu para consultar; isso nunca pode virar "nenhum". */
export function textoDosAvisos(avisos: readonly Aviso[] | null, agora: Date = new Date()): string {
  if (avisos === null) return 'Não foi possível consultar';
  if (avisos.length === 0) return 'Nenhum agora';
  const linha = linhaDoAviso(ordenarAvisos(avisos)[0], agora);
  return avisos.length === 1 ? linha : `${linha} e mais ${avisos.length - 1}`;
}
