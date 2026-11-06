import { ehStatusChamada, type Chamada } from '../types';

/** Linha da tabela `chamadas`, com os nomes das colunas. */
export interface LinhaChamada {
  id: string;
  rua_id: string;
  rua_nome: string;
  status: string;
  pessoas: number | null;
  observacao: string | null;
  criada_em: string;
  sincronizada: number;
}

export function linhaParaChamada(linha: LinhaChamada): Chamada {
  if (!ehStatusChamada(linha.status)) {
    throw new Error(`Status inválido no banco: ${linha.status}`);
  }
  return {
    id: linha.id,
    ruaId: linha.rua_id,
    ruaNome: linha.rua_nome,
    status: linha.status,
    pessoas: linha.pessoas ?? null,
    observacao: linha.observacao ?? null,
    criadaEm: linha.criada_em,
    sincronizada: linha.sincronizada === 1,
  };
}

/** Parâmetros na ordem das colunas de `chamadas`. */
export function chamadaParaParametros(c: Chamada): [string, string, string, string, number | null, string | null, string, number] {
  return [c.id, c.ruaId, c.ruaNome, c.status, c.pessoas, c.observacao, c.criadaEm, c.sincronizada ? 1 : 0];
}

/** Datas ISO em UTC comparam certo como texto; este é o corte para apagar o que for mais antigo. */
export function dataLimiteRetencao(agora: Date, dias: number): string {
  return new Date(agora.getTime() - dias * 24 * 3_600_000).toISOString();
}
