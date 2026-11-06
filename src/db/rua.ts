import { getDb } from './database';

const CHAVE_RUA = 'rua';
const CHAVE_PRIMEIRO_USO = 'primeiro_uso_feito';

/** Rua da liderança neste aparelho (só o id da rua, nunca nome de morador). */
export async function lerRuaId(): Promise<string | null> {
  const db = await getDb();
  const linha = await db.getFirstAsync<{ valor: string }>('SELECT valor FROM configuracoes WHERE chave = ?', [
    CHAVE_RUA,
  ]);
  return linha?.valor ?? null;
}

export async function salvarRuaId(ruaId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)', [CHAVE_RUA, ruaId]);
}

/** Abre a escolha da rua só uma vez. Quem já tinha rua salva não passa por ela de novo. */
export async function precisaDoPrimeiroUso(): Promise<boolean> {
  const db = await getDb();
  const linha = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM configuracoes WHERE chave IN (?, ?)',
    [CHAVE_RUA, CHAVE_PRIMEIRO_USO],
  );
  return (linha?.total ?? 0) === 0;
}

/** Coordenador sem rua própria: não pergunta de novo. */
export async function marcarPrimeiroUsoFeito(): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)', [CHAVE_PRIMEIRO_USO, '1']);
}
