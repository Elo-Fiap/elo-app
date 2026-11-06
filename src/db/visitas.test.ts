import { getDb } from './database';
import { apagarAntigas, apagarTodas } from './chamadas';
import { listarVisitas, marcarVisita } from './visitas';

jest.mock('./database');

const runAsync = jest.fn();
const getAllAsync = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
  runAsync.mockResolvedValue({ changes: 3 });
  jest.mocked(getDb).mockResolvedValue({ runAsync, getAllAsync } as never);
});

describe('visitas', () => {
  it('marcarVisita guarda só o id da rua, o início da chamada e a hora, sem duplicar', async () => {
    await marcarVisita('rua-nova', '2026-11-05T14:00:00.000Z', new Date('2026-11-05T14:10:00.000Z'));
    const [sql, params] = runAsync.mock.calls[0];
    expect(sql).toContain('INSERT OR IGNORE INTO visitas');
    expect(params).toEqual(['rua-nova', '2026-11-05T14:00:00.000Z', '2026-11-05T14:10:00.000Z']);
  });

  it('listarVisitas devolve os ids das ruas da chamada', async () => {
    getAllAsync.mockResolvedValue([{ rua_id: 'a' }, { rua_id: 'b' }]);
    await expect(listarVisitas('2026-11-05T14:00:00.000Z')).resolves.toEqual(['a', 'b']);
    expect(getAllAsync.mock.calls[0][1]).toEqual(['2026-11-05T14:00:00.000Z']);
  });
});

describe('limpeza do registro leva as visitas junto', () => {
  it('apagarTodas apaga chamadas e visitas', async () => {
    await apagarTodas();
    expect(runAsync.mock.calls.map((c) => c[0])).toEqual(['DELETE FROM chamadas', 'DELETE FROM visitas']);
  });

  it('apagarAntigas apaga visitas velhas e devolve quantas chamadas apagou', async () => {
    runAsync.mockResolvedValueOnce({ changes: 5 }).mockResolvedValueOnce({ changes: 99 });
    const agora = new Date('2026-11-05T12:00:00.000Z');
    await expect(apagarAntigas(agora, 30)).resolves.toBe(5);
    const [chamadas, visitas] = runAsync.mock.calls;
    expect(chamadas[0]).toContain('DELETE FROM chamadas');
    expect(visitas[0]).toContain('DELETE FROM visitas WHERE criada_em < ?');
    expect(visitas[1]).toEqual(chamadas[1]);
  });
});
