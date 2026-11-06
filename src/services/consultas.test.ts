import * as bairro from './bairro';
import * as cache from '../db/cache';
import * as chamadas from '../db/chamadas';
import {
  avisosGuardados,
  consultarAvisos,
  consultarPlano,
  consultarPrevisao,
  consultarSituacaoComLocais,
  guardarPlanosParaOffline,
} from './consultas';
import { ErroServico } from './http';
import * as inmet from './inmet';
import { simularFetch } from './testes';

jest.mock('../db/cache');
jest.mock('../db/chamadas');
jest.mock('./bairro');
jest.mock('./inmet');
const salvarCache = jest.mocked(cache.salvarCache);
const lerCache = jest.mocked(cache.lerCache);
const buscarPlanoRua = jest.mocked(bairro.buscarPlanoRua);

beforeEach(() => {
  jest.resetAllMocks();
  salvarCache.mockResolvedValue(undefined);
  lerCache.mockResolvedValue(null);
});

describe('consultas com cache', () => {
  it('usa uma chave de cache por área', async () => {
    jest.mocked(inmet.buscarAvisos).mockResolvedValue([]);
    await consultarAvisos({ nome: 'X', codigoIbge: '3550308' });
    expect(salvarCache.mock.calls[0][0]).toBe('avisos:3550308');
  });

  it('sem internet e com cache, o plano abre com o que foi salvo', async () => {
    buscarPlanoRua.mockRejectedValue(new ErroServico('rede', 'x'));
    lerCache.mockResolvedValue({ valor: { ruaId: 'rua-nova' }, salvoEm: '2026-11-05T10:00:00.000Z' });
    const r = await consultarPlano('rua-nova');
    expect(r.origem).toBe('cache');
    expect(lerCache).toHaveBeenCalledWith('plano:rua-nova');
  });

  it('sem internet, aviso que já acabou sai da lista', async () => {
    jest.mocked(inmet.buscarAvisos).mockRejectedValue(new ErroServico('rede', 'x'));
    const aviso = (id: string, fim: string) => ({ id, fim }) as never;
    lerCache.mockResolvedValue({
      valor: [aviso('velho', '2026-11-04T23:59:00-03:00'), aviso('vale', '2026-11-05T23:59:00-03:00')],
      salvoEm: '2026-11-04T10:00:00.000Z',
    });
    const r = await consultarAvisos({ nome: 'X', codigoIbge: '3550308' }, new Date('2026-11-05T15:00:00Z'));
    expect(r.origem).toBe('cache');
    expect(r.dados.map((a) => a.id)).toEqual(['vale']);
  });

  it('sem internet, a previsão salva é refeita para a hora atual', async () => {
    simularFetch(() => {
      throw new Error('sem rede');
    });
    const horas = {
      utc_offset_seconds: -10800,
      hourly: {
        time: ['2026-11-05T12:00', '2026-11-05T13:00', '2026-11-05T14:00', '2026-11-05T15:00'],
        precipitation: [8, 1, 2, 4],
        precipitation_probability: [90, 10, 20, 40],
      },
    };
    lerCache.mockResolvedValue({ valor: horas, salvoEm: '2026-11-05T14:00:00.000Z' });
    const area = { nome: 'X', codigoIbge: '3550308', latitude: -23.5, longitude: -46.6 };
    // 13:30 em Brasília: valem só 14:00 e 15:00, nunca as 12:00 que já passaram.
    const r = await consultarPrevisao(area, new Date('2026-11-05T16:30:00Z'));
    expect(r.origem).toBe('cache');
    expect(r.dados).toEqual({ horas: 2, totalMm: 6, chanceMaxima: 40 });
  });

  it('guardar planos: rua sem plano não impede as outras', async () => {
    buscarPlanoRua
      .mockRejectedValueOnce(new ErroServico('nao_encontrado', 'sem plano'))
      .mockResolvedValueOnce({ ruaId: 'b' } as never);
    await expect(guardarPlanosParaOffline([{ id: 'a' }, { id: 'b' }])).resolves.toBeUndefined();
    expect(salvarCache.mock.calls.map((c) => c[0])).toEqual(['plano:b']);
  });
});

describe('avisosGuardados', () => {
  const area = { nome: 'X', codigoIbge: '3550308' };
  const aviso = (id: string, fim: string) => ({ id, fim }) as never;

  it('lê a mesma chave de consultarAvisos, sem tocar na rede, e tira o aviso vencido', async () => {
    lerCache.mockResolvedValue({
      valor: [aviso('velho', '2026-11-04T23:59:00-03:00'), aviso('vale', '2026-11-05T23:59:00-03:00')],
      salvoEm: '2026-11-04T10:00:00.000Z',
    });
    const r = await avisosGuardados(area, new Date('2026-11-05T15:00:00Z'));
    expect(lerCache).toHaveBeenCalledWith('avisos:3550308');
    expect(inmet.buscarAvisos).not.toHaveBeenCalled();
    expect(r?.origem).toBe('cache');
    expect(r?.salvoEm).toBe('2026-11-04T10:00:00.000Z');
    expect(r?.dados.map((a) => a.id)).toEqual(['vale']);
  });

  it('lista guardada vazia continua sendo uma lista (diferente de nada guardado)', async () => {
    lerCache.mockResolvedValue({ valor: [], salvoEm: '2026-11-05T10:00:00.000Z' });
    await expect(avisosGuardados(area)).resolves.toMatchObject({ dados: [], origem: 'cache' });
  });

  it('sem nada guardado ou com erro no banco, devolve null', async () => {
    lerCache.mockResolvedValue(null);
    await expect(avisosGuardados(area)).resolves.toBeNull();
    lerCache.mockRejectedValue(new Error('banco'));
    await expect(avisosGuardados(area)).resolves.toBeNull();
  });
});

describe('consultarSituacaoComLocais', () => {
  const situacao = {
    bairro: 'Bairro Exemplo',
    chamadaIniciadaEm: '2026-11-05T20:00:00.000Z',
    ruas: [{ id: 'a', nome: 'Rua A', status: null, respondidaEm: null }],
  };
  const local = {
    id: 'c1',
    ruaId: 'a',
    ruaNome: 'Rua A',
    status: 'tudo_bem',
    criadaEm: '2026-11-05T20:05:00.000Z',
  } as never;

  it('a resposta guardada neste celular tira a rua do silêncio', async () => {
    jest.mocked(bairro.buscarSituacaoBairro).mockResolvedValue(situacao as never);
    jest.mocked(chamadas.listar).mockResolvedValue([local]);
    const r = await consultarSituacaoComLocais();
    expect(r.dados.ruas[0].status).toBe('tudo_bem');
  });

  it('se o banco local falhar, vale só o que o servidor mostra', async () => {
    jest.mocked(bairro.buscarSituacaoBairro).mockResolvedValue(situacao as never);
    jest.mocked(chamadas.listar).mockRejectedValue(new Error('banco'));
    const r = await consultarSituacaoComLocais();
    expect(r.dados.ruas[0].status).toBeNull();
  });
});
