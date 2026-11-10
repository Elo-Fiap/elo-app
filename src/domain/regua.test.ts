import {
  INTERVALO_REGUA_ACIMA_MS,
  INTERVALO_REGUA_MS,
  LEITURA_ANTIGA_MS,
  avisoDaRegua,
  intervaloDaRegua,
  leituraAntiga,
  valorDaLeitura,
} from './regua';
import type { LeituraRegua } from '../types';

const AGORA = new Date(2026, 10, 10, 10, 0, 0);
const haMin = (min: number) => new Date(AGORA.getTime() - min * 60_000).toISOString();

const leitura = (extra: Partial<LeituraRegua> = {}): LeituraRegua => ({
  reguaId: 'regua-exemplo',
  local: 'Córrego do bairro',
  nivelMetros: 1.42,
  limiteMetros: 1.2,
  medidaEm: haMin(1),
  ...extra,
});

describe('avisoDaRegua', () => {
  it('não aparece abaixo do limite', () => {
    expect(avisoDaRegua(leitura({ nivelMetros: 1.19 }), AGORA, false)).toBeNull();
  });

  it('aparece exatamente no limite, com nível, limite, local e hora', () => {
    const aviso = avisoDaRegua(leitura({ nivelMetros: 1.2, medidaEm: haMin(0) }), AGORA, false);
    expect(aviso).toEqual({
      titulo: 'Régua acima do limite',
      apoio: '1,20 m, limite 1,20 m. Córrego do bairro. Medida às 10h00.',
      urgente: true,
    });
  });

  it('com leitura antiga, diz que não é de agora e não é urgente', () => {
    const aviso = avisoDaRegua(leitura({ medidaEm: haMin(20) }), AGORA, false);
    expect(aviso?.titulo).toBe('Última medida da régua acima do limite');
    expect(aviso?.apoio).toBe('1,42 m, limite 1,20 m. Córrego do bairro. Medida às 09h40. Sem leitura nova desde então.');
    expect(aviso?.urgente).toBe(false);
  });

  it('no modo de exemplo, diz que é exemplo no título e no texto e não é urgente', () => {
    const aviso = avisoDaRegua(leitura(), AGORA, true);
    expect(aviso?.titulo).toBe('Exemplo: régua acima do limite');
    expect(aviso?.apoio).toMatch(/Leitura de exemplo, inventada\.$/);
    expect(aviso?.urgente).toBe(false);
  });

  it('sem local e sem data válida, não deixa pedaço vazio no texto', () => {
    const aviso = avisoDaRegua(leitura({ local: '', medidaEm: '' }), AGORA, false);
    expect(aviso?.titulo).toBe('Última medida da régua acima do limite');
    expect(aviso?.apoio).toBe('1,42 m, limite 1,20 m. Sem leitura nova desde então.');
  });
});

describe('intervaloDaRegua', () => {
  it('30 s sem leitura ou abaixo do limite, 10 s a partir do limite', () => {
    expect(intervaloDaRegua()).toBe(INTERVALO_REGUA_MS);
    expect(intervaloDaRegua({ nivelMetros: 1.19, limiteMetros: 1.2 })).toBe(INTERVALO_REGUA_MS);
    expect(intervaloDaRegua({ nivelMetros: 1.2, limiteMetros: 1.2 })).toBe(INTERVALO_REGUA_ACIMA_MS);
  });
});

describe('leituraAntiga', () => {
  it('vale até 5 minutos, inclusive', () => {
    expect(leituraAntiga(new Date(AGORA.getTime() - LEITURA_ANTIGA_MS).toISOString(), AGORA)).toBe(false);
    expect(leituraAntiga(new Date(AGORA.getTime() - LEITURA_ANTIGA_MS - 1).toISOString(), AGORA)).toBe(true);
  });

  it('data inválida conta como antiga', () => {
    expect(leituraAntiga('', AGORA)).toBe(true);
    expect(leituraAntiga('ontem', AGORA)).toBe(true);
  });

  it('relógio do sensor adiantado não vira leitura antiga', () => {
    expect(leituraAntiga(haMin(-3), AGORA)).toBe(false);
  });
});

describe('valorDaLeitura', () => {
  it('leitura recente mostra nível e limite', () => {
    expect(valorDaLeitura(leitura(), AGORA)).toBe('1,42 m, limite 1,20 m');
  });

  it('leitura antiga de hoje mostra a hora', () => {
    expect(valorDaLeitura(leitura({ medidaEm: haMin(7) }), AGORA)).toBe('1,42 m, medida às 09h53');
  });

  it('leitura de outro dia mostra o dia', () => {
    const medidaEm = new Date(2026, 10, 3, 14, 5).toISOString();
    expect(valorDaLeitura(leitura({ medidaEm }), AGORA)).toBe('1,42 m, medida em 03/11 às 14h05');
  });

  it('sem data válida, diz que não sabe a hora', () => {
    expect(valorDaLeitura(leitura({ medidaEm: '' }), AGORA)).toBe('1,42 m, sem hora da medida');
  });
});
