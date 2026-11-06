import { config } from '../config';
import type { Area } from '../types';
import { getDb } from './database';

const CHAVE_AREA = 'area';

function ehArea(valor: unknown): valor is Area {
  const a = valor as Partial<Area> | null;
  return (
    typeof a?.nome === 'string' &&
    typeof a.codigoIbge === 'string' &&
    /^\d{7}$/.test(a.codigoIbge) &&
    (a.latitude === undefined || typeof a.latitude === 'number') &&
    (a.longitude === undefined || typeof a.longitude === 'number')
  );
}

/** Área escolhida pelo usuário, ou a área padrão se nada foi salvo (ou o dado não vale). */
export async function lerArea(): Promise<Area> {
  const db = await getDb();
  const linha = await db.getFirstAsync<{ valor: string }>('SELECT valor FROM configuracoes WHERE chave = ?', [
    CHAVE_AREA,
  ]);
  if (!linha) return config.areaPadrao;
  try {
    const area: unknown = JSON.parse(linha.valor);
    return ehArea(area) ? area : config.areaPadrao;
  } catch {
    return config.areaPadrao;
  }
}

export async function salvarArea(area: Area): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)', [
    CHAVE_AREA,
    JSON.stringify(area),
  ]);
}

export async function restaurarAreaPadrao(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM configuracoes WHERE chave = ?', [CHAVE_AREA]);
}
