import { config } from '../config';
import type { Chamada } from '../types';
import { buscarLeituraRegua, buscarPlanoRua, buscarSituacaoBairro, enviarChamada } from './bairro';
import reguaReal from './__fixtures__/api-regua.json';
import situacaoReal from './__fixtures__/api-situacao.json';
import { respostaJson, simularFetch } from './testes';

const agora = new Date('2026-11-05T15:00:00.000Z');

afterEach(() => {
  config.usarMock = false;
  config.apiUrl = '';
});

describe('modo de exemplo (sem API_URL)', () => {
  it('situação: 6 ruas fictícias, chamada há 12 min, 2 em silêncio', async () => {
    const f = simularFetch(() => respostaJson({}));
    const s = await buscarSituacaoBairro(agora);
    expect(f).not.toHaveBeenCalled();
    expect(s.ruas.map((r) => r.nome)).toEqual(['Travessa 7', 'Rua Nova', 'Beco do Rio', 'Rua 3', 'Rua das Flores', 'Rua Alta']);
    expect(s.chamadaIniciadaEm).toBe('2026-11-05T14:48:00.000Z');
    expect(s.ruas.filter((r) => r.status === null)).toHaveLength(2);
    expect(s.ruas.filter((r) => r.status === null).every((r) => r.respondidaEm === null)).toBe(true);
  });

  it('régua: 1,42 m com limite de 1,20 m', async () => {
    const r = await buscarLeituraRegua(agora);
    expect(r.nivelMetros).toBe(1.42);
    expect(r.limiteMetros).toBe(1.2);
    expect(r.medidaEm).toBe('2026-11-05T14:58:00.000Z');
  });

  it('traz os dados do piloto: bairro, sem o app, coordenadas', async () => {
    const s = await buscarSituacaoBairro(agora);
    expect(s).toMatchObject({
      bairro: 'Jardim Pantanal (simulado)', bairroId: '1', cidade: 'São Paulo', uf: 'SP', codigoIbge: '3550308',
      latitude: -23.47939, longitude: -46.40912, percentualSemApp: 31, semAppMedidoEm: '2026-09-28T05:00:00.000Z',
    });
    // Parte das ruas fica sem coordenada, para a tela esconder "Ver no mapa".
    expect(s.ruas.filter((r) => r.latitude !== undefined).length).toBeGreaterThan(0);
    expect(s.ruas.find((r) => r.id === 'travessa-7')).not.toHaveProperty('latitude');
  });

  it('régua traz posição e nível de atenção do piloto', async () => {
    const r = await buscarLeituraRegua(agora);
    expect(r).toMatchObject({ latitude: -23.476551, longitude: -46.41135, atencaoMetros: 1 });
  });

  it('plano da rua; rua sem plano dá "nao_encontrado"', async () => {
    expect((await buscarPlanoRua('travessa-7')).ruaNome).toBe('Travessa 7');
    await expect(buscarPlanoRua('rua-alta')).rejects.toMatchObject({ tipo: 'nao_encontrado' });
  });

  it('enviar chamada não chama a rede', async () => {
    const f = simularFetch(() => respostaJson({}));
    await enviarChamada({} as Chamada);
    expect(f).not.toHaveBeenCalled();
  });
});

describe('com API_URL', () => {
  beforeEach(() => {
    config.apiUrl = 'https://api.test/api';
  });

  it('situação: chama /situacao e normaliza status inválido para silêncio', async () => {
    const f = simularFetch(() =>
      respostaJson({
        bairro: 'B',
        chamadaIniciadaEm: '2026-11-05T14:42:00Z',
        ruas: [
          { id: '1', nome: 'Rua A', status: 'tudo_bem', respondidaEm: '2026-11-05T14:50:00Z' },
          { id: '2', nome: 'Rua B', status: 'banana', respondidaEm: '2026-11-05T14:50:00Z' },
          { id: '3', nome: 'Rua C', status: null, respondidaEm: null },
        ],
      }),
    );
    const s = await buscarSituacaoBairro(agora);
    expect(f.mock.calls[0][0]).toBe('https://api.test/api/situacao');
    expect(s.ruas.map((r) => r.status)).toEqual(['tudo_bem', null, null]);
    expect(s.ruas[1].respondidaEm).toBeNull();
  });

  it('situação inválida dá erro tipado', async () => {
    simularFetch(() => respostaJson({ nada: true }));
    await expect(buscarSituacaoBairro(agora)).rejects.toMatchObject({ tipo: 'resposta_invalida' });
  });

  it('mock forçado tem prioridade sobre a API', async () => {
    config.usarMock = true;
    const f = simularFetch(() => respostaJson({}));
    await buscarSituacaoBairro(agora);
    expect(f).not.toHaveBeenCalled();
  });

  it('enviarChamada faz POST /chamadas sem o nome da rua nem o estado de sincronização', async () => {
    const f = simularFetch(() => respostaJson({}, 201));
    await enviarChamada({
      id: 'c1', ruaId: 'rua-3', ruaNome: 'Rua 3', status: 'agua_subindo', pessoas: 2,
      observacao: null, criadaEm: '2026-11-05T15:00:00.000Z', sincronizada: false,
    });
    expect(f.mock.calls[0][0]).toBe('https://api.test/api/chamadas');
    expect(JSON.parse((f.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      id: 'c1', ruaId: 'rua-3', status: 'agua_subindo', pessoas: 2, observacao: null, criadaEm: '2026-11-05T15:00:00.000Z',
    });
  });

  it('plano fora do formato dá erro tipado, e listas ausentes viram vazias', async () => {
    simularFetch(() => respostaJson({ ruaId: 'r' }));
    await expect(buscarPlanoRua('r')).rejects.toMatchObject({ tipo: 'resposta_invalida' });
    simularFetch(() => respostaJson({ ruaId: 'r', ruaNome: 'R', pontoEncontro: 'P', rotaSaida: 'S' }));
    await expect(buscarPlanoRua('r')).resolves.toMatchObject({ itensParaLevar: [], contatos: [], abrigo: '' });
  });

  it('plano 404 vira "nao_encontrado"', async () => {
    const f = simularFetch(() => respostaJson({}, 404));
    await expect(buscarPlanoRua('rua x')).rejects.toMatchObject({ tipo: 'nao_encontrado' });
    expect(f.mock.calls[0][0]).toBe('https://api.test/api/ruas/rua%20x/plano');
  });

  it('régua lê o JSON da API', async () => {
    simularFetch(() => respostaJson({ reguaId: 'r', local: 'L', nivelMetros: 0.5, limiteMetros: 1, medidaEm: '2026-11-05T15:00:00Z' }));
    expect((await buscarLeituraRegua()).nivelMetros).toBe(0.5);
  });

  describe('campos novos de /situacao', () => {
    const base = {
      bairro: 'B',
      chamadaIniciadaEm: null,
      ruas: [{ id: '7', nome: 'Rua das Palafitas', status: null, respondidaEm: null }],
    };
    const completo = {
      ...base,
      ruas: [{ ...base.ruas[0], latitude: -23.4766, longitude: -46.4114 }],
      bairroId: '1', cidade: 'São Paulo', uf: 'SP', codigoIbge: '3550308',
      latitude: -23.47939, longitude: -46.40912, percentualSemApp: 31, semAppMedidoEm: '2026-09-28T05:00:00.000Z',
    };

    it('campos bons passam', async () => {
      simularFetch(() => respostaJson(completo));
      const s = await buscarSituacaoBairro(agora);
      expect(s).toEqual(completo);
    });

    it('resposta antiga, sem os campos novos, continua válida e sem chaves extras', async () => {
      simularFetch(() => respostaJson(base));
      const s = await buscarSituacaoBairro(agora);
      expect(s).toEqual({ bairro: 'B', chamadaIniciadaEm: null, ruas: base.ruas });
      expect(Object.keys(s.ruas[0]).sort()).toEqual(['id', 'nome', 'respondidaEm', 'status']);
    });

    it('null da API (ausente) vira campo de fora', async () => {
      simularFetch(() =>
        respostaJson({
          ...base, bairroId: '1', cidade: 'São Paulo', uf: null, codigoIbge: null, latitude: null, longitude: null,
          percentualSemApp: null, semAppMedidoEm: null,
        }),
      );
      const s = await buscarSituacaoBairro(agora);
      expect(s).toEqual({ ...base, bairroId: '1', cidade: 'São Paulo' });
    });

    it('campo ruim fica de fora, os bons ficam', async () => {
      simularFetch(() =>
        respostaJson({
          ...completo,
          uf: 'São Paulo', codigoIbge: '355030', bairroId: 1,
          percentualSemApp: 131, semAppMedidoEm: '2026-09-28T05:00:00.000Z',
        }),
      );
      const s = await buscarSituacaoBairro(agora);
      expect(s).not.toHaveProperty('uf');
      expect(s).not.toHaveProperty('codigoIbge');
      expect(s).not.toHaveProperty('bairroId');
      // Percentual fora de 0 a 100 cai, e a data junto: sozinha ela não quer dizer nada.
      expect(s).not.toHaveProperty('percentualSemApp');
      expect(s).not.toHaveProperty('semAppMedidoEm');
      expect(s.cidade).toBe('São Paulo');
      expect(s.latitude).toBe(-23.47939);
    });

    it.each([
      ['só a latitude', { latitude: -23.4, longitude: undefined }],
      ['texto', { latitude: '-23.4', longitude: '-46.4' }],
      ['NaN ou infinito', { latitude: Number.POSITIVE_INFINITY, longitude: -46.4 }],
      ['fora do planeta', { latitude: 95, longitude: -46.4 }],
    ])('coordenada do bairro ruim (%s): nenhuma entra', async (_nome, coord) => {
      simularFetch(() => respostaJson({ ...completo, ...coord }));
      const s = await buscarSituacaoBairro(agora);
      expect(s).not.toHaveProperty('latitude');
      expect(s).not.toHaveProperty('longitude');
    });

    it('coordenada ruim na rua não derruba a rua', async () => {
      simularFetch(() => respostaJson({ ...base, ruas: [{ ...base.ruas[0], latitude: -23.4 }] }));
      const s = await buscarSituacaoBairro(agora);
      expect(s.ruas).toEqual(base.ruas);
    });

    it('percentual 0 e 100 valem; data inválida some, o percentual fica', async () => {
      simularFetch(() => respostaJson({ ...base, percentualSemApp: 0, semAppMedidoEm: 'ontem' }));
      expect(await buscarSituacaoBairro(agora)).toMatchObject({ percentualSemApp: 0 });
      simularFetch(() => respostaJson({ ...base, percentualSemApp: 100 }));
      const s = await buscarSituacaoBairro(agora);
      expect(s.percentualSemApp).toBe(100);
      expect(s).not.toHaveProperty('semAppMedidoEm');
    });
  });

  describe('campos novos de /regua', () => {
    const base = { reguaId: 'r', local: 'L', nivelMetros: 0.5, limiteMetros: 1.2, medidaEm: '2026-11-05T15:00:00Z' };

    it('campos bons passam', async () => {
      simularFetch(() => respostaJson({ ...base, ruaId: '7', latitude: -23.476551, longitude: -46.41135, atencaoMetros: 1 }));
      expect(await buscarLeituraRegua()).toEqual({
        ...base, ruaId: '7', latitude: -23.476551, longitude: -46.41135, atencaoMetros: 1,
      });
    });

    it('resposta antiga continua válida', async () => {
      simularFetch(() => respostaJson(base));
      expect(await buscarLeituraRegua()).toEqual(base);
    });

    it('atenção igual ou acima do limite, zero ou texto: fica de fora', async () => {
      for (const atencaoMetros of [1.2, 1.5, 0, -1, '1', Number.NaN]) {
        simularFetch(() => respostaJson({ ...base, atencaoMetros }));
        expect(await buscarLeituraRegua()).not.toHaveProperty('atencaoMetros');
      }
    });

    it('posição só em par e ruaId vazio fica de fora', async () => {
      simularFetch(() => respostaJson({ ...base, ruaId: ' ', latitude: -23.4, longitude: null }));
      const r = await buscarLeituraRegua();
      expect(r).toEqual(base);
    });
  });

  // Respostas gravadas da API em C# (elo-api-csharp, branch feat/painel-admin), com a semente do piloto.
  describe('resposta real da API em C#', () => {
    it('/situacao: lê bairro, "sem o app" e a posição de todas as ruas', async () => {
      simularFetch(() => respostaJson(situacaoReal));
      const s = await buscarSituacaoBairro(agora);
      expect(s).toMatchObject({
        bairro: 'Jardim Pantanal (simulado)', bairroId: '1', cidade: 'São Paulo', uf: 'SP', codigoIbge: '3550308',
        percentualSemApp: 31, semAppMedidoEm: situacaoReal.semAppMedidoEm,
      });
      expect(s.ruas).toHaveLength(situacaoReal.ruas.length);
      expect(s.ruas.every((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number')).toBe(true);
      expect(s.ruas.find((r) => r.id === '7')).toMatchObject({ nome: 'Rua das Palafitas', status: null });
    });

    it('/regua: lê rua, posição e nível de atenção', async () => {
      simularFetch(() => respostaJson(reguaReal));
      expect(await buscarLeituraRegua()).toMatchObject({
        reguaId: 'regua-exemplo', limiteMetros: 1.2, atencaoMetros: 1, ruaId: '7', latitude: -23.476551, longitude: -46.41135,
      });
    });
  });
});
