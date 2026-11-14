function doisDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

function lerData(iso: string): Date | null {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? null : data;
}

/** "14:05" no horário do aparelho. Texto vazio se a data não vale. */
export function horaCurta(iso: string): string {
  const d = lerData(iso);
  return d ? `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}` : '';
}

/** "05/11 14:05" no horário do aparelho. */
export function dataHoraCurta(iso: string): string {
  const d = lerData(iso);
  return d ? `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)} ${horaCurta(iso)}` : '';
}

/**
 * "às 14:05" se foi hoje; senão "em 03/11 às 14:05". Dado velho precisa mostrar o dia.
 * A tela passa `horaComH`; as mensagens de SMS e WhatsApp usam o formato padrão.
 */
export function quandoSalvo(
  iso: string,
  agora: Date = new Date(),
  formatarHora: (iso: string) => string = horaCurta,
): string {
  const d = lerData(iso);
  if (!d) return '';
  if (d.toDateString() === agora.toDateString()) return `às ${formatarHora(iso)}`;
  return `em ${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)} às ${formatarHora(iso)}`;
}

/** "agora", "há 5 min", "há 2 h". Texto vazio se a data não vale. */
export function textoHa(iso: string | null, agora: Date): string {
  const d = iso ? lerData(iso) : null;
  if (!d) return '';
  const minutos = Math.floor((agora.getTime() - d.getTime()) / 60_000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  return `há ${Math.floor(minutos / 60)} h`;
}

/** Minúsculas e sem acento, para filtrar listas pelo que a pessoa digitou. */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** 1.4 vira "1,40 m". */
export function formatarMetros(valor: number): string {
  return `${valor.toFixed(2).replace('.', ',')} m`;
}

/** 6.5 vira "6,5". */
export function formatarMilimetros(valor: number): string {
  return String(valor).replace('.', ',');
}

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function mesmoDia(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/** "21h13" no horário do aparelho. */
export function horaComH(iso: string): string {
  const d = lerData(iso);
  return d ? `${doisDigitos(d.getHours())}h${doisDigitos(d.getMinutes())}` : '';
}

/** "Hoje, 21h02", "Ontem, 18h00" ou "2 nov, 17h40". */
export function diaEHora(iso: string, agora: Date = new Date()): string {
  const d = lerData(iso);
  if (!d) return '';
  const hora = horaComH(iso);
  if (mesmoDia(d, agora)) return `Hoje, ${hora}`;
  const ontem = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 1);
  if (mesmoDia(d, ontem)) return `Ontem, ${hora}`;
  return `${d.getDate()} ${MESES_CURTOS[d.getMonth()]}, ${hora}`;
}

/** "Novembro". */
export function nomeDoMes(iso: string): string {
  const d = lerData(iso);
  return d ? MESES[d.getMonth()] : '';
}

/** "até 23h59" se acaba hoje; senão "até 08/11". */
export function ateQuando(iso: string, agora: Date = new Date()): string {
  const d = lerData(iso);
  if (!d) return '';
  if (mesmoDia(d, agora)) return `até ${horaComH(iso)}`;
  return `até ${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}`;
}

/** "menos de 1 minuto", "12 minutos", "1 hora", "3 horas". Texto vazio se a data não vale. */
export function textoDuracao(iso: string | null, agora: Date): string {
  const d = iso ? lerData(iso) : null;
  if (!d) return '';
  const minutos = Math.floor((agora.getTime() - d.getTime()) / 60_000);
  if (minutos < 1) return 'menos de 1 minuto';
  if (minutos < 60) return minutos === 1 ? '1 minuto' : `${minutos} minutos`;
  const horas = Math.floor(minutos / 60);
  return horas === 1 ? '1 hora' : `${horas} horas`;
}

/** "31%" ou "31%, medido em 28/09/2026", arredondado para inteiro. A data some se não vale. */
export function textoSemApp(percentual: number, medidoEm?: string): string {
  const d = medidoEm ? lerData(medidoEm) : null;
  const valor = `${Math.round(percentual)}%`;
  if (!d) return valor;
  return `${valor}, medido em ${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()}`;
}
