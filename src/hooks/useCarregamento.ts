import { useCallback, useEffect, useReducer, useRef, type DependencyList } from 'react';

export interface EstadoCarregamento<T> {
  carregando: boolean;
  erro: Error | null;
  dados: T | undefined;
}

type Acao<T> = { tipo: 'inicio' } | { tipo: 'trocou' } | { tipo: 'sucesso'; dados: T } | { tipo: 'falha'; erro: Error };

export function reducerCarregamento<T>(estado: EstadoCarregamento<T>, acao: Acao<T>): EstadoCarregamento<T> {
  switch (acao.tipo) {
    case 'inicio':
      return { ...estado, carregando: true, erro: null };
    // Mudou o que se pede (outra rua, outra área): o dado anterior não vale mais.
    case 'trocou':
      return { carregando: true, erro: null, dados: undefined };
    case 'sucesso':
      return { carregando: false, erro: null, dados: acao.dados };
    // Em caso de falha, mantém os dados antigos: melhor mostrar o último que ficar em branco.
    case 'falha':
      return { ...estado, carregando: false, erro: acao.erro };
  }
}

export interface ResultadoCarregamento<T> extends EstadoCarregamento<T> {
  recarregar: () => Promise<void>;
}

/**
 * Executa `buscar` ao montar e sempre que `deps` mudar (nesse caso, limpa os dados
 * antigos). `recarregar` mantém os dados na tela até a nova resposta. Não atualiza o
 * estado depois de desmontar, nem com resposta de uma busca que já foi substituída.
 */
export function useCarregamento<T>(
  buscar: () => Promise<T>,
  deps: DependencyList = [],
): ResultadoCarregamento<T> {
  const [estado, despachar] = useReducer(reducerCarregamento<T>, {
    carregando: true,
    erro: null,
    dados: undefined,
  });
  const montado = useRef(true);
  const numeroDaBusca = useRef(0);
  const buscarAtual = useRef(buscar);
  buscarAtual.current = buscar;

  const executar = useCallback(async (tipoInicio: 'inicio' | 'trocou') => {
    const meu = ++numeroDaBusca.current;
    despachar({ tipo: tipoInicio });
    try {
      const dados = await buscarAtual.current();
      if (montado.current && meu === numeroDaBusca.current) despachar({ tipo: 'sucesso', dados });
    } catch (e) {
      const erro = e instanceof Error ? e : new Error(String(e));
      if (montado.current && meu === numeroDaBusca.current) despachar({ tipo: 'falha', erro });
    }
  }, []);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    void executar('trocou');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const recarregar = useCallback(() => executar('inicio'), [executar]);

  return { ...estado, recarregar };
}
