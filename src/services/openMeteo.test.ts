import { config } from '../config';
import { ErroServico } from './http';
import { buscarHorasDePrevisao, montarUrlPrevisao, resumirProximasHoras } from './openMeteo';
import { respostaJson, simularFetch } from './testes';

// Horários locais de Brasília (UTC-3), como o Open-Meteo devolve.
const json = {
  utc_offset_seconds: -10800,
  hourly: {
    time: ['2026-11-05T12:00', '2026-11-05T13:00', '2026-11-05T14:00', '2026-11-05T15:00', '2026-11-05T16:00', '2026-11-05T17:00', '2026-11-05T18:00'],
    precipitation: [9, 1.0, 2.0, 0.5, 4.0, 8.0, 7.0],
    precipitation_probability: [99, 20, 40, 60, 90, 30, 100],
  },
};

describe('resumirProximasHoras', () => {
  it('soma as 3 próximas horas usando o deslocamento da resposta (14:30 em Brasília = 17:30 UTC)', () => {
    const r = resumirProximasHoras(json, new Date('2026-11-05T17:30:00Z'), 3);
    // horários 15:00, 16:00 e 17:00 locais
    expect(r).toEqual({ horas: 3, totalMm: 12.5, chanceMaxima: 90 });
  });

  it('não depende do fuso do aparelho: a mesma conta com o mesmo instante dá o mesmo resultado', () => {
    const antes = process.env.TZ;
    process.env.TZ = 'Asia/Tokyo';
    try {
      expect(resumirProximasHoras(json, new Date('2026-11-05T17:30:00Z'), 3).totalMm).toBe(12.5);
    } finally {
      process.env.TZ = antes;
    }
  });

  it('na hora exata, não conta a hora que acabou de fechar', () => {
    const r = resumirProximasHoras(json, new Date('2026-11-05T17:00:00Z'), 3); // 14:00 local
    expect(r.totalMm).toBe(12.5);
  });

  it('previsão que acaba antes: conta só as horas que existem', () => {
    const r = resumirProximasHoras(json, new Date('2026-11-05T20:30:00Z'), 3); // 17:30 local
    expect(r).toEqual({ horas: 1, totalMm: 7, chanceMaxima: 100 });
  });

  it('hora sem valor de chuva fica de fora, em vez de parecer 0 mm', () => {
    const r = resumirProximasHoras(
      { utc_offset_seconds: 0, hourly: { time: ['2026-11-05T11:00'], precipitation: [null], precipitation_probability: [null] } },
      new Date('2026-11-05T10:30:00Z'),
    );
    expect(r).toEqual({ horas: 0, totalMm: 0, chanceMaxima: 0 });
  });

  it('chance sem valor conta como zero', () => {
    const r = resumirProximasHoras(
      { utc_offset_seconds: 0, hourly: { time: ['2026-11-05T11:00'], precipitation: [1.5], precipitation_probability: [null] } },
      new Date('2026-11-05T10:30:00Z'),
    );
    expect(r).toEqual({ horas: 1, totalMm: 1.5, chanceMaxima: 0 });
  });

  it('resposta fora do formato dá erro tipado', () => {
    expect(() => resumirProximasHoras({}, new Date())).toThrow(ErroServico);
    expect(() => resumirProximasHoras(null, new Date())).toThrow(ErroServico);
  });
});

describe('buscarHorasDePrevisao', () => {
  afterEach(() => {
    config.usarMock = false;
  });

  const area = { nome: 'x', codigoIbge: '3550308', latitude: -23.5475, longitude: -46.63611 };

  it('monta a URL pedida e devolve as horas', async () => {
    const fetchMock = simularFetch(() => respostaJson(json));
    const r = await buscarHorasDePrevisao(area, new Date('2026-11-05T17:30:00Z'));
    expect(fetchMock.mock.calls[0][0]).toBe(montarUrlPrevisao(-23.5475, -46.63611));
    expect(fetchMock.mock.calls[0][0]).toContain('hourly=precipitation,precipitation_probability&forecast_days=2&timezone=America/Sao_Paulo');
    expect(r).toEqual(json);
  });

  it('resposta fora do formato dá erro, para não ir parar no cache', async () => {
    simularFetch(() => respostaJson({ nada: true }));
    await expect(buscarHorasDePrevisao(area)).rejects.toMatchObject({ tipo: 'resposta_invalida' });
  });

  it('sem coordenadas, erro "sem_coordenadas" e nenhuma chamada', async () => {
    const fetchMock = simularFetch(() => respostaJson(json));
    await expect(buscarHorasDePrevisao({ nome: 'x', codigoIbge: '3550308' })).rejects.toMatchObject({ tipo: 'sem_coordenadas' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('com mock, não usa a rede', async () => {
    config.usarMock = true;
    const fetchMock = simularFetch(() => respostaJson({}));
    const agora = new Date('2026-11-05T17:30:00Z');
    const r = resumirProximasHoras(await buscarHorasDePrevisao({ nome: 'x', codigoIbge: '3550308' }, agora), agora);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(r.horas).toBe(3);
    expect(r.totalMm).toBeGreaterThan(0);
  });
});
