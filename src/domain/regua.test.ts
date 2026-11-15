import {
  ANUNCIO_INICIAL,
  FUTURO_TOLERADO_MS,
  INTERVALO_REGUA_ACIMA_MS,
  INTERVALO_REGUA_MS,
  INTERVALO_VIBRACAO_MS,
  LEITURA_ANTIGA_MS,
  avisoDaRegua,
  decidirAnuncio,
  horaNaoConfere,
  intervaloDaRegua,
  leituraAntiga,
  notaDaMedida,
  valorDaRegua,
  type EstadoDoAnuncio,
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

  it('medida à frente do celular até 2 minutos é tolerada e conta como de agora', () => {
    expect(leituraAntiga(haMin(-1), AGORA)).toBe(false);
    expect(leituraAntiga(new Date(AGORA.getTime() + FUTURO_TOLERADO_MS).toISOString(), AGORA)).toBe(false);
    expect(horaNaoConfere(haMin(-2), AGORA)).toBe(false);
  });

  it('medida mais de 2 minutos à frente: a hora não confere e a leitura não vale como de agora', () => {
    const adiante = new Date(AGORA.getTime() + FUTURO_TOLERADO_MS + 1).toISOString();
    expect(horaNaoConfere(adiante, AGORA)).toBe(true);
    expect(leituraAntiga(adiante, AGORA)).toBe(true);
  });

  it('data inválida não é "hora que não confere"', () => {
    expect(horaNaoConfere('', AGORA)).toBe(false);
  });
});

describe('relógio do celular no aviso', () => {
  it('medida 2 minutos à frente é urgente, como leitura de agora', () => {
    const aviso = avisoDaRegua(leitura({ medidaEm: haMin(-2) }), AGORA, false);
    expect(aviso?.titulo).toBe('Régua acima do limite');
    expect(aviso?.urgente).toBe(true);
  });

  it('medida 3 minutos à frente não é urgente e o texto diz que a hora não confere', () => {
    const aviso = avisoDaRegua(leitura({ medidaEm: haMin(-3) }), AGORA, false);
    expect(aviso?.urgente).toBe(false);
    expect(aviso?.apoio).toBe('1,42 m, limite 1,20 m. Córrego do bairro. A hora da medida não confere com a do celular.');
    expect(aviso?.apoio).not.toMatch(/Medida às/);
  });

  it('notaDaMedida: hora da medida, aviso de relógio ou vazio', () => {
    expect(notaDaMedida(haMin(0), AGORA)).toBe('Medida às 10h00.');
    expect(notaDaMedida(haMin(-3), AGORA)).toBe('A hora da medida não confere com a do celular.');
    expect(notaDaMedida('', AGORA)).toBe('');
  });
});

describe('valorDaRegua', () => {
  it('sem leitura: buscando, ou sem leitura se a busca falhou', () => {
    expect(valorDaRegua(undefined, false, AGORA)).toBe('Buscando…');
    expect(valorDaRegua(undefined, true, AGORA)).toBe('Sem leitura agora');
  });

  it('leitura de agora abaixo do limite mostra nível e limite', () => {
    expect(valorDaRegua(leitura({ nivelMetros: 0.9 }), false, AGORA)).toBe('0,90 m, limite 1,20 m');
  });

  it('acima do limite, diz "acima do limite"', () => {
    expect(valorDaRegua(leitura(), false, AGORA)).toBe('1,42 m, limite 1,20 m, acima do limite');
  });

  it('com nível de atenção, abaixo do limite, diz "em atenção"', () => {
    expect(valorDaRegua(leitura({ nivelMetros: 1.0, atencaoMetros: 0.9 }), false, AGORA)).toBe(
      '1,00 m, limite 1,20 m, em atenção',
    );
    expect(valorDaRegua(leitura({ nivelMetros: 0.8, atencaoMetros: 0.9 }), false, AGORA)).toBe('0,80 m, limite 1,20 m');
  });

  it('leitura antiga de hoje mostra a hora', () => {
    expect(valorDaRegua(leitura({ medidaEm: haMin(7) }), false, AGORA)).toBe('1,42 m, medida às 09h53');
  });

  it('leitura antiga de outro dia mostra o dia', () => {
    const medidaEm = new Date(2026, 10, 3, 14, 5).toISOString();
    expect(valorDaRegua(leitura({ medidaEm }), false, AGORA)).toBe('1,42 m, medida em 03/11 às 14h05');
  });

  it('sem data válida, diz que não sabe a hora', () => {
    expect(valorDaRegua(leitura({ medidaEm: '' }), false, AGORA)).toBe('1,42 m, sem hora da medida');
  });

  it('hora que não confere com o celular não afirma que a leitura é de agora', () => {
    expect(valorDaRegua(leitura({ medidaEm: haMin(-3) }), false, AGORA)).toBe('1,42 m, hora da medida não confere');
  });

  it('mantém a leitura antiga na tela mesmo se a busca nova falhou', () => {
    expect(valorDaRegua(leitura({ medidaEm: haMin(7) }), true, AGORA)).toBe('1,42 m, medida às 09h53');
  });
});

describe('decidirAnuncio', () => {
  const T0 = AGORA.getTime();
  const aviso = (extra: { urgente?: boolean; titulo?: string } = {}) => ({
    titulo: extra.titulo ?? 'Régua acima do limite',
    apoio: 'x',
    urgente: extra.urgente ?? true,
  });
  const tratado = (extra: Partial<EstadoDoAnuncio> = {}): EstadoDoAnuncio => ({
    medidaEm: 'A',
    titulo: 'Régua acima do limite',
    vibrouEm: T0,
    ...extra,
  });

  it('primeira leitura acima do limite: anuncia e vibra', () => {
    const d = decidirAnuncio(ANUNCIO_INICIAL, { medidaEm: 'A', aviso: aviso() }, false, T0);
    expect(d).toEqual({
      anunciar: true,
      vibrar: true,
      proximo: { medidaEm: 'A', titulo: 'Régua acima do limite', vibrouEm: T0 },
    });
  });

  it('primeira leitura abaixo do limite: nada, mas lembra a leitura', () => {
    const d = decidirAnuncio(ANUNCIO_INICIAL, { medidaEm: 'A', aviso: null }, false, T0);
    expect(d).toEqual({ anunciar: false, vibrar: false, proximo: { medidaEm: 'A', titulo: null, vibrouEm: null } });
  });

  it('sem leitura, nada acontece', () => {
    const d = decidirAnuncio(ANUNCIO_INICIAL, null, false, T0);
    expect(d).toEqual({ anunciar: false, vibrar: false, proximo: ANUNCIO_INICIAL });
  });

  it('com a busca em andamento, nada acontece e o estado não muda', () => {
    const anterior = tratado({ medidaEm: null, titulo: null, vibrouEm: null });
    const d = decidirAnuncio(anterior, { medidaEm: 'B', aviso: aviso() }, true, T0);
    expect(d).toEqual({ anunciar: false, vibrar: false, proximo: anterior });
  });

  it('a mesma leitura de novo (nova busca, mesmo medidaEm): não anuncia nem vibra', () => {
    const d = decidirAnuncio(tratado({ vibrouEm: T0 - INTERVALO_VIBRACAO_MS - 1 }), { medidaEm: 'A', aviso: aviso() }, false, T0);
    expect(d.anunciar).toBe(false);
    expect(d.vibrar).toBe(false);
  });

  it('de "atual" para "antiga" só pelo tempo: muda o título, mas não anuncia nem vibra', () => {
    const antiga = aviso({ titulo: 'Última medida da régua acima do limite', urgente: false });
    const d = decidirAnuncio(tratado({ vibrouEm: null }), { medidaEm: 'A', aviso: antiga }, false, T0 + 6 * 60_000);
    expect(d.anunciar).toBe(false);
    expect(d.vibrar).toBe(false);
    expect(d.proximo.titulo).toBe('Última medida da régua acima do limite');
  });

  it('leitura nova urgente depois de 5 minutos vibra, mas não anuncia de novo se o título é o mesmo', () => {
    const d = decidirAnuncio(tratado(), { medidaEm: 'B', aviso: aviso() }, false, T0 + INTERVALO_VIBRACAO_MS);
    expect(d.vibrar).toBe(true);
    expect(d.anunciar).toBe(false);
    expect(d.proximo.vibrouEm).toBe(T0 + INTERVALO_VIBRACAO_MS);
  });

  it('nível oscilando em volta do limite: no máximo uma vibração a cada 5 minutos', () => {
    let estado = ANUNCIO_INICIAL;
    let vibracoes = 0;
    // Uma leitura nova a cada 10 s durante 12 minutos, sempre acima do limite.
    for (let t = 0; t <= 12 * 60_000; t += 10_000) {
      const d = decidirAnuncio(estado, { medidaEm: `L${t}`, aviso: aviso() }, false, T0 + t);
      if (d.vibrar) vibracoes += 1;
      estado = d.proximo;
    }
    expect(vibracoes).toBe(3);
  });

  it('abaixo do limite e depois acima de novo: a segunda subida anuncia, mas respeita os 5 minutos para vibrar', () => {
    const emBaixo = decidirAnuncio(tratado(), { medidaEm: 'B', aviso: null }, false, T0 + 10_000);
    expect(emBaixo.anunciar).toBe(false);
    expect(emBaixo.proximo.titulo).toBeNull();

    const emCima = decidirAnuncio(emBaixo.proximo, { medidaEm: 'C', aviso: aviso() }, false, T0 + 20_000);
    expect(emCima.anunciar).toBe(true);
    expect(emCima.vibrar).toBe(false);
  });

  it('leitura nova que muda o título anuncia (de antiga para atual, ou de exemplo para real)', () => {
    const antes = tratado({ titulo: 'Última medida da régua acima do limite', vibrouEm: null });
    const d = decidirAnuncio(antes, { medidaEm: 'B', aviso: aviso() }, false, T0);
    expect(d.anunciar).toBe(true);
    expect(d.vibrar).toBe(true);
  });

  it('leitura de exemplo ou não urgente anuncia, mas nunca vibra', () => {
    const exemplo = aviso({ titulo: 'Exemplo: régua acima do limite', urgente: false });
    const d = decidirAnuncio(ANUNCIO_INICIAL, { medidaEm: 'A', aviso: exemplo }, false, T0);
    expect(d.anunciar).toBe(true);
    expect(d.vibrar).toBe(false);
    expect(d.proximo.vibrouEm).toBeNull();
  });

  it('o aviso some e volta por outra busca em andamento: espera a busca terminar para decidir', () => {
    const anterior = tratado();
    const durante = decidirAnuncio(anterior, { medidaEm: 'B', aviso: aviso() }, true, T0 + 10_000);
    const depois = decidirAnuncio(durante.proximo, { medidaEm: 'B', aviso: aviso() }, false, T0 + 11_000);
    expect(depois.vibrar).toBe(false);
    expect(depois.proximo.medidaEm).toBe('B');
  });
});
