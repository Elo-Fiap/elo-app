import { config } from '../config';
import { previsaoDeExemplo } from '../mocks/openMeteo';
import type { Area, PrevisaoChuva } from '../types';
import { ErroServico, getJson } from './http';

const URL_BASE = 'https://api.open-meteo.com/v1/forecast';

export function montarUrlPrevisao(latitude: number, longitude: number): string {
  const params = [
    `latitude=${latitude}`,
    `longitude=${longitude}`,
    'hourly=precipitation,precipitation_probability',
    'forecast_days=2',
    'timezone=America/Sao_Paulo',
  ];
  return `${URL_BASE}?${params.join('&')}`;
}

interface RespostaOpenMeteo {
  utc_offset_seconds?: unknown;
  hourly?: {
    time?: unknown;
    precipitation?: unknown;
    precipitation_probability?: unknown;
  };
}

const HORA_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

/** Converte "2026-11-05T14:00" (horário local do Open-Meteo) em instante UTC, usando o deslocamento da resposta. */
function instanteUtc(horaLocal: string, deslocamentoSegundos: number): number | null {
  const m = HORA_LOCAL.exec(horaLocal);
  if (!m) return null;
  const [ano, mes, dia, hora, minuto] = m.slice(1).map(Number);
  return Date.UTC(ano, mes - 1, dia, hora, minuto) - deslocamentoSegundos * 1000;
}

function numeroOuZero(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : 0;
}

/**
 * Soma a chuva das próximas `horas` horas e pega a maior chance.
 * Os horários da resposta são locais, sem fuso: o instante certo sai de
 * `utc_offset_seconds`, nunca do fuso do aparelho. No Open-Meteo, a chuva de
 * um horário é a da hora que terminou nele; por isso entram os horários
 * depois de `agora`, até `agora + horas`.
 */
export function resumirProximasHoras(json: unknown, agora: Date, horas = 3): PrevisaoChuva {
  const r = json as RespostaOpenMeteo | null;
  const time = r?.hourly?.time;
  const chuva = r?.hourly?.precipitation;
  const chance = r?.hourly?.precipitation_probability;
  const deslocamento = r?.utc_offset_seconds;
  if (!Array.isArray(time) || !Array.isArray(chuva) || typeof deslocamento !== 'number') {
    throw new ErroServico('resposta_invalida', 'Previsão fora do formato esperado');
  }

  const inicio = agora.getTime();
  const fim = inicio + horas * 3_600_000;
  let total = 0;
  let maxima = 0;
  let usadas = 0;
  time.forEach((hora, i) => {
    const instante = typeof hora === 'string' ? instanteUtc(hora, deslocamento) : null;
    if (instante === null || instante <= inicio || instante > fim) return;
    // Hora sem valor não é "0 mm": fica de fora da conta.
    if (typeof chuva[i] !== 'number') return;
    usadas++;
    total += numeroOuZero(chuva[i]);
    maxima = Math.max(maxima, Array.isArray(chance) ? numeroOuZero(chance[i]) : 0);
  });

  return { horas: usadas, totalMm: Math.round(total * 10) / 10, chanceMaxima: Math.round(maxima) };
}

/** Busca as horas da previsão, já conferindo o formato (o que vier errado não chega ao cache). */
export async function buscarHorasDePrevisao(area: Area, agora: Date = new Date()): Promise<unknown> {
  let json: unknown;
  if (config.usarMock) {
    json = previsaoDeExemplo(agora);
  } else {
    if (area.latitude === undefined || area.longitude === undefined) {
      throw new ErroServico('sem_coordenadas', 'A área não tem latitude e longitude');
    }
    json = await getJson<unknown>(montarUrlPrevisao(area.latitude, area.longitude));
  }
  resumirProximasHoras(json, agora);
  return json;
}
