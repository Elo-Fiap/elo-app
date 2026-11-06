import { config } from '../config';
import type { Chamada } from '../types';
import { getDb } from './database';
import { chamadaParaParametros, dataLimiteRetencao, linhaParaChamada, type LinhaChamada } from './mapeamentos';

/** Guarda a chamada (substitui se o id já existe). */
export async function salvar(chamada: Chamada): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO chamadas
       (id, rua_id, rua_nome, status, pessoas, observacao, criada_em, sincronizada)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    chamadaParaParametros(chamada),
  );
}

/** As mais recentes primeiro. */
export async function listar(limite = 100): Promise<Chamada[]> {
  const db = await getDb();
  const linhas = await db.getAllAsync<LinhaChamada>(
    'SELECT * FROM chamadas ORDER BY criada_em DESC LIMIT ?',
    [limite],
  );
  return linhas.map(linhaParaChamada);
}

export async function buscarPorId(id: string): Promise<Chamada | null> {
  const db = await getDb();
  const linha = await db.getFirstAsync<LinhaChamada>('SELECT * FROM chamadas WHERE id = ?', [id]);
  return linha ? linhaParaChamada(linha) : null;
}

/** Chamadas que ainda não chegaram ao servidor, da mais antiga para a mais nova. */
export async function listarPendentes(): Promise<Chamada[]> {
  const db = await getDb();
  const linhas = await db.getAllAsync<LinhaChamada>(
    'SELECT * FROM chamadas WHERE sincronizada = 0 ORDER BY criada_em ASC',
  );
  return linhas.map(linhaParaChamada);
}

export async function marcarSincronizada(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE chamadas SET sincronizada = 1 WHERE id = ?', [id]);
}

export async function apagarTodas(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM chamadas');
  await db.runAsync('DELETE FROM visitas');
}

/** Apaga as chamadas e as visitas com mais de `dias` dias (mesmo as não sincronizadas). Devolve quantas chamadas apagou. */
export async function apagarAntigas(
  agora: Date = new Date(),
  dias: number = config.diasDeHistorico,
): Promise<number> {
  const db = await getDb();
  const limite = dataLimiteRetencao(agora, dias);
  const resultado = await db.runAsync('DELETE FROM chamadas WHERE criada_em < ?', [limite]);
  await db.runAsync('DELETE FROM visitas WHERE criada_em < ?', [limite]);
  return resultado.changes;
}
