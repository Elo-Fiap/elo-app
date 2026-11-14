import { linhaDoAviso, montarTextoAviso, ordenarAvisos, textoDosAvisos } from './avisoTexto';
import { rotuloDaRua } from './estados';
import {
  ateQuando,
  dataHoraCurta,
  diaEHora,
  formatarMetros,
  formatarMilimetros,
  horaComH,
  horaCurta,
  nomeDoMes,
  normalizarBusca,
  quandoSalvo,
  textoDuracao,
  textoHa,
  textoSemApp,
} from './formatar';
import { acimaDoLimite, emAtencao, textoRegua } from './regua';
import { semToqueDuplo } from './toque';
import type { Aviso } from '../types';

describe('rotuloDaRua', () => {
  it('a situação da rua em terceira pessoa; sem status é silêncio', () => {
    expect(rotuloDaRua(null)).toBe('Em silêncio');
    expect(rotuloDaRua('preciso_ajuda')).toBe('Precisa de ajuda');
    expect(rotuloDaRua('agua_subindo')).toBe('Água subindo');
    expect(rotuloDaRua('tudo_bem')).toBe('Tudo bem');
  });
});

describe('formatar', () => {
  const instante = new Date(2026, 10, 5, 9, 7); // horário local, qualquer fuso

  it('hora e data no horário do aparelho, com dois dígitos', () => {
    expect(horaCurta(instante.toISOString())).toBe('09:07');
    expect(dataHoraCurta(instante.toISOString())).toBe('05/11 09:07');
  });

  it('data inválida vira texto vazio, sem quebrar', () => {
    expect(horaCurta('ontem')).toBe('');
    expect(dataHoraCurta('')).toBe('');
    expect(textoHa('lixo', instante)).toBe('');
    expect(textoHa(null, instante)).toBe('');
  });

  it('textoHa: agora, minutos e horas', () => {
    const base = instante.getTime();
    expect(textoHa(new Date(base - 20_000).toISOString(), instante)).toBe('agora');
    expect(textoHa(new Date(base - 5 * 60_000).toISOString(), instante)).toBe('há 5 min');
    expect(textoHa(new Date(base - 125 * 60_000).toISOString(), instante)).toBe('há 2 h');
  });

  it('quandoSalvo mostra o dia quando não é hoje', () => {
    expect(quandoSalvo(instante.toISOString(), instante)).toBe('às 09:07');
    expect(quandoSalvo(new Date(2026, 10, 3, 14, 5).toISOString(), instante)).toBe('em 03/11 às 14:05');
    expect(quandoSalvo('lixo', instante)).toBe('');
    expect(quandoSalvo(instante.toISOString(), instante, horaComH)).toBe('às 09h07');
  });

  it('normalizarBusca ignora acento e caixa', () => {
    expect(normalizarBusca('  São Mateus ')).toBe('sao mateus');
  });

  it('metros e milímetros com vírgula', () => {
    expect(formatarMetros(1.2)).toBe('1,20 m');
    expect(formatarMilimetros(6.5)).toBe('6,5');
  });
});

describe('régua', () => {
  it('o limite conta como acima', () => {
    expect(acimaDoLimite(1.2, 1.2)).toBe(true);
    expect(acimaDoLimite(1.19, 1.2)).toBe(false);
  });

  it('textoRegua mostra nível e limite', () => {
    expect(textoRegua({ nivelMetros: 1.42, limiteMetros: 1.2 })).toBe('1,42 m, limite 1,20 m');
  });

  it('atenção usa atencaoMetros quando vem, e só abaixo do limite', () => {
    const l = { limiteMetros: 1.2, atencaoMetros: 1 };
    expect(emAtencao({ ...l, nivelMetros: 0.99 })).toBe(false);
    expect(emAtencao({ ...l, nivelMetros: 1 })).toBe(true);
    expect(emAtencao({ ...l, nivelMetros: 1.19 })).toBe(true);
    expect(emAtencao({ ...l, nivelMetros: 1.2 })).toBe(false);
  });

  it('sem atencaoMetros não há atenção', () => {
    expect(emAtencao({ nivelMetros: 1.1, limiteMetros: 1.2 })).toBe(false);
  });
});

describe('textoSemApp', () => {
  it('percentual com a data da medida', () => {
    expect(textoSemApp(31, '2026-09-28T15:00:00.000Z')).toBe('31%, medido em 28/09/2026');
  });

  it('sem data, ou com data inválida, só o percentual', () => {
    expect(textoSemApp(31)).toBe('31%');
    expect(textoSemApp(31, 'ontem')).toBe('31%');
    expect(textoSemApp(31.5)).toBe('31,5%');
  });
});

describe('montarTextoAviso', () => {
  const aviso: Aviso = {
    id: '1',
    titulo: 'Tempestade',
    severidade: 'Perigo',
    gravidade: 2,
    inicio: new Date(2026, 10, 5, 0, 1).toISOString(),
    fim: new Date(2026, 10, 5, 23, 59).toISOString(),
    quando: 'hoje',
    riscos: ['Corte de energia'],
    instrucoes: ['Evite abrigar-se debaixo de árvores.'],
  };

  it('traz aviso, instrução, chuva e sempre 199 e 193', () => {
    const texto = montarTextoAviso({ nome: 'Bairro X' }, [aviso], { horas: 3, totalMm: 6.5, chanceMaxima: 80 });
    expect(texto).toContain('Bairro X');
    expect(texto).toContain('Tempestade');
    expect(texto).toContain('05/11 00:01');
    expect(texto).toContain('Evite abrigar-se');
    expect(texto).toContain('6,5 mm');
    expect(texto).toContain('199');
    expect(texto).toContain('193');
  });

  it('sem aviso e sem previsão ainda diz isso e lembra os telefones', () => {
    const texto = montarTextoAviso({ nome: 'Bairro X' }, [], null);
    expect(texto).toContain('Nenhum aviso');
    expect(texto).not.toContain('mm');
    expect(texto).toContain('199');
  });

  it('sem conseguir consultar, nunca diz "nenhum aviso"', () => {
    const texto = montarTextoAviso({ nome: 'Bairro X' }, null, null);
    expect(texto).not.toContain('Nenhum aviso');
    expect(texto).toContain('Não foi possível consultar');
    expect(texto).toContain('199');
  });

  it('avisa quando os dados são salvos e quando são de exemplo', () => {
    const texto = montarTextoAviso({ nome: 'Bairro X' }, [aviso], null, {
      salvoEm: new Date(2026, 10, 3, 14, 5).toISOString(),
      exemplo: true,
    });
    expect(texto.split('\n')[0]).toContain('EXEMPLO');
    expect(texto).toContain('Dados salvos em 03/11 às 14:05');
  });
});

describe('semToqueDuplo', () => {
  it('dois toques seguidos fazem uma ação só, e depois libera', async () => {
    jest.useFakeTimers();
    try {
      const trava = { current: false };
      const acao = jest.fn(async () => undefined);
      await Promise.all([semToqueDuplo(trava, acao), semToqueDuplo(trava, acao)]);
      expect(acao).toHaveBeenCalledTimes(1);
      jest.runAllTimers();
      await semToqueDuplo(trava, acao);
      expect(acao).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('libera mesmo se a ação falhar', async () => {
    jest.useFakeTimers();
    try {
      const trava = { current: false };
      await expect(semToqueDuplo(trava, () => Promise.reject(new Error('x')))).rejects.toThrow('x');
      jest.runAllTimers();
      expect(trava.current).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('formatar: dia e hora', () => {
  const agora = new Date(2026, 10, 5, 21, 30);
  const em = (mes: number, dia: number, h: number, min: number) => new Date(2026, mes, dia, h, min).toISOString();

  it('horaComH', () => {
    expect(horaComH(em(10, 5, 21, 13))).toBe('21h13');
    expect(horaComH(em(10, 5, 9, 7))).toBe('09h07');
    expect(horaComH('lixo')).toBe('');
  });

  it('diaEHora: hoje, ontem e outros dias', () => {
    expect(diaEHora(em(10, 5, 21, 2), agora)).toBe('Hoje, 21h02');
    expect(diaEHora(em(10, 4, 18, 0), agora)).toBe('Ontem, 18h00');
    expect(diaEHora(em(10, 2, 17, 40), agora)).toBe('2 nov, 17h40');
    expect(diaEHora(em(9, 30, 8, 5), agora)).toBe('30 out, 08h05');
    expect(diaEHora('lixo', agora)).toBe('');
  });

  it('diaEHora: ontem vale na virada do mês', () => {
    expect(diaEHora(em(9, 31, 23, 50), new Date(2026, 10, 1, 8, 0))).toBe('Ontem, 23h50');
  });

  it('nomeDoMes', () => {
    expect(nomeDoMes(em(10, 5, 9, 0))).toBe('Novembro');
    expect(nomeDoMes(em(2, 5, 9, 0))).toBe('Março');
    expect(nomeDoMes('lixo')).toBe('');
  });

  it('ateQuando: mesmo dia mostra a hora, outro dia mostra a data', () => {
    expect(ateQuando(em(10, 5, 23, 59), agora)).toBe('até 23h59');
    expect(ateQuando(em(10, 8, 12, 0), agora)).toBe('até 08/11');
    expect(ateQuando('lixo', agora)).toBe('');
  });

  it('textoDuracao: singular, plural e menos de um minuto', () => {
    const antes = (min: number) => new Date(agora.getTime() - min * 60_000).toISOString();
    expect(textoDuracao(antes(0), agora)).toBe('menos de 1 minuto');
    expect(textoDuracao(antes(1), agora)).toBe('1 minuto');
    expect(textoDuracao(antes(12), agora)).toBe('12 minutos');
    expect(textoDuracao(antes(60), agora)).toBe('1 hora');
    expect(textoDuracao(antes(125), agora)).toBe('2 horas');
    expect(textoDuracao(antes(180), agora)).toBe('3 horas');
    expect(textoDuracao('lixo', agora)).toBe('');
    expect(textoDuracao(null, agora)).toBe('');
  });
});

describe('avisos: ordem e texto curto', () => {
  const agora = new Date(2026, 10, 5, 12, 0);
  const aviso = (id: string, gravidade: 1 | 2 | 3, quando: 'hoje' | 'futuro', titulo = id): Aviso => ({
    id,
    titulo,
    severidade: gravidade === 1 ? 'Perigo Potencial' : gravidade === 2 ? 'Perigo' : 'Grande Perigo',
    gravidade,
    inicio: new Date(2026, 10, 5, 0, 1).toISOString(),
    fim: new Date(2026, 10, 5, 23, 59).toISOString(),
    quando,
    riscos: [],
    instrucoes: [],
  });

  it('quem vale hoje vem antes dos futuros; depois, a maior gravidade', () => {
    const lista = [aviso('futuro-grave', 3, 'futuro'), aviso('hoje-leve', 1, 'hoje'), aviso('hoje-grave', 3, 'hoje'), aviso('hoje-medio', 2, 'hoje')];
    expect(ordenarAvisos(lista).map((a) => a.id)).toEqual(['hoje-grave', 'hoje-medio', 'hoje-leve', 'futuro-grave']);
  });

  it('não altera a lista recebida', () => {
    const lista = [aviso('b', 1, 'futuro'), aviso('a', 3, 'hoje')];
    ordenarAvisos(lista);
    expect(lista.map((a) => a.id)).toEqual(['b', 'a']);
  });

  it('linhaDoAviso', () => {
    expect(linhaDoAviso(aviso('1', 2, 'hoje', 'Tempestade'), agora)).toBe('Tempestade, Perigo, até 23h59');
  });

  it('textoDosAvisos: nunca consultou, nenhum, um e vários', () => {
    expect(textoDosAvisos(null, agora)).toBe('Não foi possível consultar');
    expect(textoDosAvisos([], agora)).toBe('Nenhum agora');
    expect(textoDosAvisos([aviso('1', 2, 'hoje', 'Tempestade')], agora)).toBe('Tempestade, Perigo, até 23h59');
    const tres = [aviso('a', 1, 'hoje', 'Vento'), aviso('b', 3, 'hoje', 'Chuva'), aviso('c', 2, 'futuro', 'Granizo')];
    expect(textoDosAvisos(tres, agora)).toBe('Chuva, Grande Perigo, até 23h59 e mais 2');
  });
});
