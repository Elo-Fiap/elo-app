import { lerCache, salvarCache } from '../db/cache';

export interface ResultadoComCache<T> {
  dados: T;
  /** 'cache' = a rede falhou e estes são os últimos dados salvos. */
  origem: 'rede' | 'cache';
  /** ISO 8601 de quando os dados foram salvos no aparelho. */
  salvoEm: string;
}

/**
 * Tenta a rede e guarda a resposta no cache. Se a rede falhar, devolve o cache
 * com a data em que foi salvo. Sem cache, repassa o erro da rede.
 */
export async function comCache<T>(
  chave: string,
  buscar: () => Promise<T>,
): Promise<ResultadoComCache<T>> {
  try {
    const dados = await buscar();
    const salvoEm = new Date().toISOString();
    try {
      await salvarCache(chave, dados, salvoEm);
    } catch {
      // Não conseguir guardar não pode esconder um dado que acabou de chegar.
    }
    return { dados, origem: 'rede', salvoEm };
  } catch (erro) {
    let guardado = null;
    try {
      guardado = await lerCache<T>(chave);
    } catch {
      // Banco indisponível: vale o erro da rede.
    }
    if (!guardado) throw erro;
    return { dados: guardado.valor, origem: 'cache', salvoEm: guardado.salvoEm };
  }
}
