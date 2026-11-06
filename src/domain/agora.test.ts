import type { Chamada, Rua, SituacaoBairro } from '../types';
import { estadoDaAgora, textoDoBairro } from './agora';

const INICIO = '2026-11-05T14:00:00.000Z';
const min = (m: number) => new Date(Date.parse(INICIO) + m * 60_000).toISOString();

const rua = (id: string, status: Rua['status'] = null, minutos: number | null = null): Rua => ({
  id,
  nome: id,
  status,
  respondidaEm: minutos === null ? null : min(minutos),
});

const situacao = (ruas: Rua[], inicio: string | null = INICIO): SituacaoBairro => ({
  bairro: 'Bairro X',
  chamadaIniciadaEm: inicio,
  ruas,
});

const local = (id: string, ruaId: string, status: Chamada['status'], minutos: number, sincronizada = false): Chamada => ({
  id,
  ruaId,
  ruaNome: ruaId,
  status,
  pessoas: null,
  observacao: null,
  criadaEm: min(minutos),
  sincronizada,
});

describe('estadoDaAgora', () => {
  it('sem chamada aberta: devolve a rua, se achar', () => {
    const s = situacao([rua('a')], null);
    expect(estadoDaAgora(s, 'a', [])).toEqual({ tipo: 'sem_chamada', rua: rua('a') });
    expect(estadoDaAgora(s, 'z', [])).toEqual({ tipo: 'sem_chamada', rua: null });
    expect(estadoDaAgora(s, null, [])).toEqual({ tipo: 'sem_chamada', rua: null });
  });

  it('chamada aberta e rua nula ou fora da lista: sem rua', () => {
    const s = situacao([rua('a')]);
    expect(estadoDaAgora(s, null, [])).toEqual({ tipo: 'sem_rua' });
    expect(estadoDaAgora(s, 'z', [])).toEqual({ tipo: 'sem_rua' });
  });

  it('rua em silêncio e sem chamada local: perguntando', () => {
    expect(estadoDaAgora(situacao([rua('a')]), 'a', [])).toEqual({ tipo: 'perguntando', rua: rua('a') });
  });

  it('chamada local pendente: respondida e ainda não enviada', () => {
    const c = local('1', 'a', 'agua_subindo', 5);
    const e = estadoDaAgora(situacao([rua('a')]), 'a', [c]);
    expect(e).toEqual({ tipo: 'respondida', rua: rua('a'), status: 'agua_subindo', respondidaEm: min(5), chamada: c, enviada: false });
  });

  it('chamada local já sincronizada: enviada', () => {
    const c = local('1', 'a', 'tudo_bem', 5, true);
    const e = estadoDaAgora(situacao([rua('a')]), 'a', [c]);
    expect(e).toMatchObject({ tipo: 'respondida', enviada: true, chamada: c });
  });

  it('vale a chamada local mais recente da rua, ignorando outras ruas', () => {
    const velha = local('1', 'a', 'tudo_bem', 3);
    const nova = local('2', 'a', 'agua_subindo', 8);
    const outra = local('3', 'b', 'preciso_ajuda', 9);
    const e = estadoDaAgora(situacao([rua('a'), rua('b')]), 'a', [velha, nova, outra]);
    expect(e).toMatchObject({ tipo: 'respondida', status: 'agua_subindo', chamada: nova });
  });

  it('chamada local anterior ao início da chamada não conta', () => {
    const antiga = local('1', 'a', 'tudo_bem', -30, true);
    expect(estadoDaAgora(situacao([rua('a')]), 'a', [antiga])).toEqual({ tipo: 'perguntando', rua: rua('a') });
  });

  it('resposta que veio do servidor, sem chamada local: respondida e enviada', () => {
    const e = estadoDaAgora(situacao([rua('a', 'tudo_bem', 4)]), 'a', []);
    expect(e).toEqual({ tipo: 'respondida', rua: rua('a', 'tudo_bem', 4), status: 'tudo_bem', respondidaEm: min(4), chamada: null, enviada: true });
  });

  it('servidor com resposta mais nova que a local: vale o servidor', () => {
    const c = local('1', 'a', 'tudo_bem', 3, true);
    const e = estadoDaAgora(situacao([rua('a', 'preciso_ajuda', 10)]), 'a', [c]);
    expect(e).toMatchObject({ tipo: 'respondida', status: 'preciso_ajuda', chamada: null, enviada: true });
  });

  it('servidor com resposta mais antiga que a local: vale a local', () => {
    const c = local('1', 'a', 'agua_subindo', 10);
    const e = estadoDaAgora(situacao([rua('a', 'tudo_bem', 3)]), 'a', [c]);
    expect(e).toMatchObject({ tipo: 'respondida', status: 'agua_subindo', chamada: c, enviada: false });
  });

  it('empate de horário: vale a chamada local (o servidor guarda o criadaEm que recebeu)', () => {
    const c = local('1', 'a', 'agua_subindo', 5, true);
    const e = estadoDaAgora(situacao([rua('a', 'agua_subindo', 5)]), 'a', [c]);
    expect(e).toMatchObject({ chamada: c });
  });
});

describe('textoDoBairro', () => {
  const agora = new Date(Date.parse(INICIO) + 12 * 60_000);

  it('respondidas de total e há quanto tempo a chamada abriu', () => {
    const ruas = [rua('1', 'tudo_bem', 1), rua('2', 'agua_subindo', 2), rua('3', 'preciso_ajuda', 3), rua('4', 'tudo_bem', 4), rua('5'), rua('6')];
    expect(textoDoBairro(situacao(ruas), agora)).toBe('4 de 6 ruas, há 12 min');
  });

  it('sem início de chamada, só a contagem', () => {
    expect(textoDoBairro(situacao([rua('1', 'tudo_bem', 1), rua('2')], null), agora)).toBe('1 de 2 ruas');
  });
});
