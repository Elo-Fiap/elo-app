import * as sqlite from 'expo-sqlite';
import { esquecerBancoAberto, getDb, MIGRACOES, migrar } from './database';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

function bancoFalso(versaoInicial = 0) {
  let versao = versaoInicial;
  const executados: string[] = [];
  const db = {
    getFirstAsync: jest.fn(async () => ({ user_version: versao })),
    execAsync: jest.fn(async (sql: string) => {
      const m = /PRAGMA user_version = (\d+)/.exec(sql);
      if (m) versao = Number(m[1]);
      executados.push(sql.trim());
    }),
    withTransactionAsync: jest.fn(async (tarefa: () => Promise<void>) => tarefa()),
    closeAsync: jest.fn(async () => undefined),
  };
  return { db, executados, versao: () => versao };
}

describe('migrar', () => {
  it('banco novo: roda tudo e grava a versão', async () => {
    const b = bancoFalso(0);
    await migrar(b.db as never);
    expect(b.versao()).toBe(MIGRACOES.length);
    expect(b.executados[0]).toContain('CREATE TABLE chamadas');
    expect(b.executados[0]).toContain('CREATE TABLE cache');
    expect(b.executados[0]).toContain('CREATE TABLE configuracoes');
  });

  it('tem duas migrações; a segunda cria só a tabela de visitas', async () => {
    expect(MIGRACOES).toHaveLength(2);
    expect(MIGRACOES[1]).toContain('CREATE TABLE visitas');
    expect(MIGRACOES[1]).toContain('PRIMARY KEY (rua_id, chamada_iniciada_em)');
    expect(MIGRACOES[1]).not.toContain('chamadas');
  });

  it('banco na versão 1 roda só a migração 2', async () => {
    const b = bancoFalso(1);
    await migrar(b.db as never);
    expect(b.executados).toHaveLength(2);
    expect(b.executados[0]).toContain('CREATE TABLE visitas');
    expect(b.versao()).toBe(2);
  });

  it('banco já atualizado: não roda nada', async () => {
    const b = bancoFalso(MIGRACOES.length);
    await migrar(b.db as never);
    expect(b.db.execAsync).not.toHaveBeenCalled();
  });

  it('roda só as migrações que faltam, cada uma em transação', async () => {
    const b = bancoFalso(1);
    await migrar(b.db as never, ['-- v1', '-- v2', '-- v3']);
    expect(b.executados).toEqual(['-- v2', 'PRAGMA user_version = 2', '-- v3', 'PRAGMA user_version = 3']);
    expect(b.db.withTransactionAsync).toHaveBeenCalledTimes(2);
  });
});

describe('getDb', () => {
  const openDatabaseAsync = jest.mocked(sqlite.openDatabaseAsync);

  beforeEach(() => {
    esquecerBancoAberto();
    openDatabaseAsync.mockReset();
  });

  it('chamadas simultâneas abrem o banco uma única vez', async () => {
    const b = bancoFalso();
    openDatabaseAsync.mockResolvedValue(b.db as never);
    const [x, y, z] = await Promise.all([getDb(), getDb(), getDb()]);
    expect(openDatabaseAsync).toHaveBeenCalledTimes(1);
    expect(x).toBe(y);
    expect(y).toBe(z);
    expect(await getDb()).toBe(x);
  });

  it('se a abertura falhar, a próxima chamada tenta de novo', async () => {
    const b = bancoFalso();
    openDatabaseAsync.mockRejectedValueOnce(new Error('sem espaço')).mockResolvedValue(b.db as never);
    await expect(getDb()).rejects.toThrow('sem espaço');
    await expect(getDb()).resolves.toBe(b.db);
    expect(openDatabaseAsync).toHaveBeenCalledTimes(2);
  });

  it('se a migração falhar, fecha o banco e não guarda o estado ruim', async () => {
    const b = bancoFalso();
    b.db.withTransactionAsync.mockRejectedValueOnce(new Error('sql ruim'));
    openDatabaseAsync.mockResolvedValue(b.db as never);
    await expect(getDb()).rejects.toThrow('sql ruim');
    expect(b.db.closeAsync).toHaveBeenCalled();
    await expect(getDb()).resolves.toBe(b.db);
  });
});
