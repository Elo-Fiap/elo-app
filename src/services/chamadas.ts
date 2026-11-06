import * as repositorio from '../db/chamadas';
import { criarIdChamada } from '../domain/chamada';
import type { Chamada, StatusChamada } from '../types';
import { enviarChamada } from './bairro';

export interface DadosChamada {
  ruaId: string;
  ruaNome: string;
  status: StatusChamada;
  pessoas: number | null;
  observacao: string | null;
}

/**
 * Guarda no celular. Não depende de internet: a confirmação aparece na hora,
 * e o envio vem depois, com `tentarEnviar`.
 */
export async function guardarChamada(dados: DadosChamada, agora: Date = new Date()): Promise<Chamada> {
  const chamada: Chamada = {
    id: criarIdChamada(agora),
    ruaId: dados.ruaId,
    ruaNome: dados.ruaNome,
    status: dados.status,
    pessoas: dados.status === 'preciso_ajuda' ? dados.pessoas : null,
    observacao: dados.observacao?.trim() ? dados.observacao.trim() : null,
    criadaEm: agora.toISOString(),
    sincronizada: false,
  };
  await repositorio.salvar(chamada);
  return chamada;
}

/** Tenta enviar e marca como sincronizada. Falha de rede deixa a chamada pendente, sem erro. */
export async function tentarEnviar(chamada: Chamada): Promise<boolean> {
  try {
    await enviarChamada(chamada);
    await repositorio.marcarSincronizada(chamada.id);
    return true;
  } catch {
    return false;
  }
}

/** Tenta de novo as chamadas pendentes, da mais antiga para a mais nova. */
export async function reenviarPendentes(): Promise<{ enviadas: number; faltam: number }> {
  const pendentes = await repositorio.listarPendentes();
  let enviadas = 0;
  for (const chamada of pendentes) {
    if (await tentarEnviar(chamada)) enviadas++;
  }
  return { enviadas, faltam: pendentes.length - enviadas };
}
