import type { Chamada } from '../types';
import { agruparPorMes } from './registro';

const c = (id: string, ano: number, mes: number, dia: number): Chamada => ({
  id,
  ruaId: 'r',
  ruaNome: 'R',
  status: 'tudo_bem',
  pessoas: null,
  observacao: null,
  criadaEm: new Date(ano, mes - 1, dia, 12, 0).toISOString(),
  sincronizada: true,
});

describe('agruparPorMes', () => {
  it('agrupa por mês, mantendo a ordem recebida', () => {
    const grupos = agruparPorMes([c('a', 2026, 11, 5), c('b', 2026, 11, 2), c('c', 2026, 10, 30)]);
    expect(grupos.map((g) => [g.chave, g.mes, g.chamadas.map((x) => x.id)])).toEqual([
      ['2026-11', 'Novembro', ['a', 'b']],
      ['2026-10', 'Outubro', ['c']],
    ]);
  });

  it('o mesmo mês de anos diferentes fica separado', () => {
    const grupos = agruparPorMes([c('a', 2026, 1, 5), c('b', 2025, 1, 20)]);
    expect(grupos.map((g) => g.chave)).toEqual(['2026-01', '2025-01']);
    expect(grupos.map((g) => g.mes)).toEqual(['Janeiro', 'Janeiro']);
  });

  it('lista vazia', () => {
    expect(agruparPorMes([])).toEqual([]);
  });

  it('data inválida não some do registro', () => {
    const ruim = { ...c('x', 2026, 11, 1), criadaEm: 'lixo' };
    const grupos = agruparPorMes([c('a', 2026, 11, 5), ruim]);
    expect(grupos.flatMap((g) => g.chamadas.map((x) => x.id))).toEqual(['a', 'x']);
  });
});
