import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

export const NOME_BANCO = 'elo-da-chuva.db';

/**
 * Migrações em ordem. A posição + 1 é o número da versão (PRAGMA user_version).
 * Nunca edite uma migração já publicada: acrescente outra no fim.
 */
export const MIGRACOES: readonly string[] = [
  `
  CREATE TABLE chamadas (
    id TEXT PRIMARY KEY NOT NULL,
    rua_id TEXT NOT NULL,
    rua_nome TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('tudo_bem', 'agua_subindo', 'preciso_ajuda')),
    pessoas INTEGER,
    observacao TEXT,
    criada_em TEXT NOT NULL,
    sincronizada INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX idx_chamadas_criada_em ON chamadas (criada_em);
  CREATE INDEX idx_chamadas_sincronizada ON chamadas (sincronizada);
  CREATE TABLE cache (
    chave TEXT PRIMARY KEY NOT NULL,
    valor TEXT NOT NULL,
    salvo_em TEXT NOT NULL
  );
  CREATE TABLE configuracoes (
    chave TEXT PRIMARY KEY NOT NULL,
    valor TEXT NOT NULL
  );
  `,
  `
  CREATE TABLE visitas (
    rua_id TEXT NOT NULL,
    chamada_iniciada_em TEXT NOT NULL,
    criada_em TEXT NOT NULL,
    PRIMARY KEY (rua_id, chamada_iniciada_em)
  );
  `,
];

type BancoParaMigrar = Pick<SQLiteDatabase, 'execAsync' | 'getFirstAsync' | 'withTransactionAsync'>;

export async function migrar(db: BancoParaMigrar, migracoes: readonly string[] = MIGRACOES): Promise<void> {
  const linha = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const atual = linha?.user_version ?? 0;
  for (let versao = atual + 1; versao <= migracoes.length; versao++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(migracoes[versao - 1]);
      await db.execAsync(`PRAGMA user_version = ${versao}`);
    });
  }
}

async function abrir(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(NOME_BANCO);
  try {
    await db.execAsync('PRAGMA journal_mode = WAL');
    await migrar(db);
  } catch (erro) {
    await db.closeAsync().catch(() => undefined);
    throw erro;
  }
  return db;
}

let aberto: Promise<SQLiteDatabase> | null = null;

/** Banco único. Chamadas simultâneas esperam a mesma abertura (sem corrida). Se falhar, a próxima tenta de novo. */
export function getDb(): Promise<SQLiteDatabase> {
  if (!aberto) {
    aberto = abrir().catch((erro) => {
      aberto = null;
      throw erro;
    });
  }
  return aberto;
}

/** Só para testes. */
export function esquecerBancoAberto(): void {
  aberto = null;
}
