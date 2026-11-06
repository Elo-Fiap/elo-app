import type { Distrito } from '../types';
import { ErroServico, getJson } from './http';

const URL_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios';

/** Distritos do município, em ordem alfabética (pt-BR). */
export async function buscarDistritos(codigoIbge: string): Promise<Distrito[]> {
  const json = await getJson<unknown>(`${URL_BASE}/${encodeURIComponent(codigoIbge)}/distritos`);
  if (!Array.isArray(json)) throw new ErroServico('resposta_invalida', 'IBGE devolveu algo inesperado');
  return json
    .filter((d): d is { id: unknown; nome: string } => typeof d?.nome === 'string')
    .map((d) => ({ id: String(d.id), nome: d.nome.trim() }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
