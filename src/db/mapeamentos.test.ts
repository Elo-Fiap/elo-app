import type { Chamada } from '../types';
import { chamadaParaParametros, dataLimiteRetencao, linhaParaChamada, type LinhaChamada } from './mapeamentos';

const linha: LinhaChamada = {
  id: 'c1',
  rua_id: 'rua-3',
  rua_nome: 'Rua 3',
  status: 'preciso_ajuda',
  pessoas: 4,
  observacao: 'Idosa sozinha',
  criada_em: '2026-11-05T15:00:00.000Z',
  sincronizada: 1,
};

const chamada: Chamada = {
  id: 'c1',
  ruaId: 'rua-3',
  ruaNome: 'Rua 3',
  status: 'preciso_ajuda',
  pessoas: 4,
  observacao: 'Idosa sozinha',
  criadaEm: '2026-11-05T15:00:00.000Z',
  sincronizada: true,
};

describe('mapeamentos de chamada', () => {
  it('linha -> chamada', () => {
    expect(linhaParaChamada(linha)).toEqual(chamada);
  });

  it('colunas nulas e sincronizada 0', () => {
    const r = linhaParaChamada({ ...linha, pessoas: null, observacao: null, sincronizada: 0 });
    expect(r).toMatchObject({ pessoas: null, observacao: null, sincronizada: false });
  });

  it('status inválido no banco dá erro', () => {
    expect(() => linhaParaChamada({ ...linha, status: 'ok' })).toThrow(/Status inválido/);
  });

  it('chamada -> parâmetros, na ordem das colunas', () => {
    expect(chamadaParaParametros(chamada)).toEqual(['c1', 'rua-3', 'Rua 3', 'preciso_ajuda', 4, 'Idosa sozinha', '2026-11-05T15:00:00.000Z', 1]);
    expect(chamadaParaParametros({ ...chamada, sincronizada: false, pessoas: null })[7]).toBe(0);
  });

  it('ida e volta mantém tudo', () => {
    const [id, rua_id, rua_nome, status, pessoas, observacao, criada_em, sincronizada] = chamadaParaParametros(chamada);
    expect(linhaParaChamada({ id, rua_id, rua_nome, status, pessoas, observacao, criada_em, sincronizada })).toEqual(chamada);
  });
});

describe('dataLimiteRetencao', () => {
  it('30 dias antes, em ISO UTC', () => {
    expect(dataLimiteRetencao(new Date('2026-11-05T12:00:00.000Z'), 30)).toBe('2026-10-06T12:00:00.000Z');
  });
});
