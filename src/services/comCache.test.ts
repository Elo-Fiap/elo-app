import * as cache from '../db/cache';
import { ErroServico } from './http';
import { comCache } from './comCache';

jest.mock('../db/cache');
const salvarCache = jest.mocked(cache.salvarCache);
const lerCache = jest.mocked(cache.lerCache);

beforeEach(() => {
  jest.resetAllMocks();
  salvarCache.mockResolvedValue(undefined);
});

describe('comCache', () => {
  it('rede ok: devolve e guarda no cache', async () => {
    const r = await comCache('k', async () => ({ a: 1 }));
    expect(r.origem).toBe('rede');
    expect(r.dados).toEqual({ a: 1 });
    expect(salvarCache).toHaveBeenCalledWith('k', { a: 1 }, r.salvoEm);
  });

  it('rede ok mas cache quebrado: ainda devolve os dados', async () => {
    salvarCache.mockRejectedValue(new Error('disco cheio'));
    await expect(comCache('k', async () => 5)).resolves.toMatchObject({ dados: 5, origem: 'rede' });
  });

  it('rede falha: devolve o cache com a data em que foi salvo', async () => {
    lerCache.mockResolvedValue({ valor: { a: 0 }, salvoEm: '2026-11-05T10:00:00.000Z' });
    const r = await comCache('k', async () => {
      throw new ErroServico('rede', 'x');
    });
    expect(r).toEqual({ dados: { a: 0 }, origem: 'cache', salvoEm: '2026-11-05T10:00:00.000Z' });
    expect(salvarCache).not.toHaveBeenCalled();
  });

  it('rede falha e sem cache: propaga o erro da rede', async () => {
    lerCache.mockResolvedValue(null);
    await expect(
      comCache('k', async () => {
        throw new ErroServico('timeout', 'x');
      }),
    ).rejects.toMatchObject({ tipo: 'timeout' });
  });

  it('rede falha e banco falha: propaga o erro da rede', async () => {
    lerCache.mockRejectedValue(new Error('banco'));
    await expect(
      comCache('k', async () => {
        throw new ErroServico('rede', 'x');
      }),
    ).rejects.toMatchObject({ tipo: 'rede' });
  });
});
