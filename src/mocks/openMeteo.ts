// Previsão de exemplo no formato do Open-Meteo: horas em horário local sem fuso
// e `utc_offset_seconds` para saber de que fuso são.

const DESLOCAMENTO_SEGUNDOS = -3 * 3600;

export function previsaoDeExemplo(agora: Date): unknown {
  const horaLocal = Math.floor((agora.getTime() + DESLOCAMENTO_SEGUNDOS * 1000) / 3_600_000) * 3_600_000;
  const time: string[] = [];
  const precipitation: number[] = [];
  const precipitation_probability: number[] = [];
  const mmPorHora = [0.4, 2.8, 6.2, 4.1, 1.5, 0.3];
  for (let i = -12; i < 36; i++) {
    time.push(new Date(horaLocal + i * 3_600_000).toISOString().slice(0, 16));
    precipitation.push(i >= 0 && i < mmPorHora.length ? mmPorHora[i] : 0);
    precipitation_probability.push(i >= 0 && i < mmPorHora.length ? 85 - i * 5 : 10);
  }
  return {
    utc_offset_seconds: DESLOCAMENTO_SEGUNDOS,
    hourly: { time, precipitation, precipitation_probability },
  };
}
