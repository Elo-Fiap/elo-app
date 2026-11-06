import type { Chamada } from '../types';
import { nomeDoMes } from './formatar';

export interface GrupoDoMes {
  /** "2026-11": separa o mesmo mês de anos diferentes. */
  chave: string;
  mes: string;
  chamadas: Chamada[];
}

/** Agrupa por mês do aparelho, mantendo a ordem recebida. Data inválida vai para um grupo sem nome: nunca some do registro. */
export function agruparPorMes(chamadas: readonly Chamada[]): GrupoDoMes[] {
  const grupos: GrupoDoMes[] = [];
  const porChave = new Map<string, GrupoDoMes>();
  for (const chamada of chamadas) {
    const d = new Date(chamada.criadaEm);
    const valida = !Number.isNaN(d.getTime());
    const chave = valida ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'sem-data';
    let grupo = porChave.get(chave);
    if (!grupo) {
      grupo = { chave, mes: nomeDoMes(chamada.criadaEm), chamadas: [] };
      porChave.set(chave, grupo);
      grupos.push(grupo);
    }
    grupo.chamadas.push(chamada);
  }
  return grupos;
}
