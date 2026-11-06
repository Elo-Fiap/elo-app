import { getDb } from './database';

/** Marca que a pessoa vai até a rua nesta chamada. Guarda só o id da rua, nunca nome nem texto. */
export async function marcarVisita(
  ruaId: string,
  chamadaIniciadaEm: string,
  agora: Date = new Date(),
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR IGNORE INTO visitas (rua_id, chamada_iniciada_em, criada_em) VALUES (?, ?, ?)',
    [ruaId, chamadaIniciadaEm, agora.toISOString()],
  );
}

/** Ids das ruas marcadas nesta chamada. */
export async function listarVisitas(chamadaIniciadaEm: string): Promise<string[]> {
  const db = await getDb();
  const linhas = await db.getAllAsync<{ rua_id: string }>(
    'SELECT rua_id FROM visitas WHERE chamada_iniciada_em = ?',
    [chamadaIniciadaEm],
  );
  return linhas.map((l) => l.rua_id);
}
