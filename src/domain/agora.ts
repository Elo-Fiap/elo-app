import type { Chamada, Rua, SituacaoBairro, StatusChamada } from '../types';
import { textoHa } from './formatar';

export type EstadoAgora =
  | { tipo: 'sem_chamada'; rua: Rua | null }
  | { tipo: 'sem_rua' }
  | { tipo: 'perguntando'; rua: Rua }
  | {
      tipo: 'respondida';
      rua: Rua;
      status: StatusChamada;
      respondidaEm: string;
      /** Null quando a resposta veio de outra pessoa ou do servidor, não deste celular. */
      chamada: Chamada | null;
      enviada: boolean;
    };

function instante(iso: string | null): number {
  return iso ? Date.parse(iso) : Number.NaN;
}

/** O que a tela Agora mostra. A chamada local só vale se for desta chamada do bairro e não for mais velha que a resposta do servidor. */
export function estadoDaAgora(
  situacao: SituacaoBairro,
  ruaId: string | null,
  locais: readonly Chamada[],
): EstadoAgora {
  const rua = ruaId === null ? null : (situacao.ruas.find((r) => r.id === ruaId) ?? null);
  const inicio = instante(situacao.chamadaIniciadaEm);
  if (situacao.chamadaIniciadaEm === null || Number.isNaN(inicio)) return { tipo: 'sem_chamada', rua };
  if (!rua) return { tipo: 'sem_rua' };

  let local: Chamada | null = null;
  for (const c of locais) {
    if (c.ruaId !== rua.id) continue;
    const t = instante(c.criadaEm);
    if (Number.isNaN(t) || t < inicio) continue;
    if (!local || t > instante(local.criadaEm)) local = c;
  }

  const doServidor = instante(rua.respondidaEm);
  if (local && !(doServidor > instante(local.criadaEm))) {
    return {
      tipo: 'respondida',
      rua,
      status: local.status,
      respondidaEm: local.criadaEm,
      chamada: local,
      enviada: local.sincronizada,
    };
  }
  if (rua.status !== null && rua.respondidaEm !== null) {
    return { tipo: 'respondida', rua, status: rua.status, respondidaEm: rua.respondidaEm, chamada: null, enviada: true };
  }
  return { tipo: 'perguntando', rua };
}

/** "4 de 6 ruas, há 12 min". Sem início de chamada, só "4 de 6 ruas". */
export function textoDoBairro(situacao: SituacaoBairro, agora: Date = new Date()): string {
  const respondidas = situacao.ruas.filter((r) => r.status !== null).length;
  const base = `${respondidas} de ${situacao.ruas.length} ruas`;
  const ha = textoHa(situacao.chamadaIniciadaEm, agora);
  return ha ? `${base}, ${ha}` : base;
}
