import { getDb } from './database';

export interface ItemDeCache<T> {
  valor: T;
  /** ISO 8601 de quando foi salvo. */
  salvoEm: string;
}

export async function salvarCache(chave: string, valor: unknown, salvoEm: string = new Date().toISOString()): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO cache (chave, valor, salvo_em) VALUES (?, ?, ?)', [
    chave,
    JSON.stringify(valor),
    salvoEm,
  ]);
}

/** Null se não há nada guardado ou se o conteúdo está corrompido. */
export async function lerCache<T>(chave: string): Promise<ItemDeCache<T> | null> {
  const db = await getDb();
  const linha = await db.getFirstAsync<{ valor: string; salvo_em: string }>(
    'SELECT valor, salvo_em FROM cache WHERE chave = ?',
    [chave],
  );
  if (!linha) return null;
  try {
    return { valor: JSON.parse(linha.valor) as T, salvoEm: linha.salvo_em };
  } catch {
    return null;
  }
}
