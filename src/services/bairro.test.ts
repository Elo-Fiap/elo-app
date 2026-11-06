import { config } from '../config';
import type { Chamada } from '../types';
import { buscarLeituraRegua, buscarPlanoRua, buscarSituacaoBairro, enviarChamada } from './bairro';
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
});
