import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';

/** O que o relógio precisa saber do app: se está aberto e quando muda. */
export interface FonteDoEstadoDoApp {
  currentState: AppStateStatus;
  addEventListener(tipo: 'change', ouvinte: (estado: AppStateStatus) => void): Pick<NativeEventSubscription, 'remove'>;
}

/**
 * Embrulha `recarregar` para não empilhar buscas: enquanto a anterior não terminou,
 * a chamada nova é ignorada. O timeout do http (10 s) é igual ao intervalo acima do limite.
 */
export function semEmpilhar(recarregar: () => Promise<void>): () => Promise<void> {
  let emAndamento = false;
  return async () => {
    if (emAndamento) return;
    emAndamento = true;
    try {
      await recarregar();
    } finally {
      emAndamento = false;
    }
  };
}

/**
 * Liga o relógio: busca a cada `intervaloMs` com o app aberto, e na hora ao voltar do segundo plano
 * (o dado na tela pode estar velho). Devolve a função que desliga tudo.
 */
export function iniciarAtualizacao(
  buscar: () => Promise<void>,
  intervaloMs: number,
  estadoDoApp: FonteDoEstadoDoApp = AppState,
): () => void {
  let relogio: ReturnType<typeof setInterval> | null = null;
  const ligar = () => {
    relogio ??= setInterval(() => void buscar(), intervaloMs);
  };
  const desligar = () => {
    if (relogio !== null) clearInterval(relogio);
    relogio = null;
  };

  if (estadoDoApp.currentState === 'active') ligar();
  const inscricao = estadoDoApp.addEventListener('change', (estado) => {
    if (estado === 'active') {
      ligar();
      void buscar();
    } else {
      desligar();
    }
  });

  return () => {
    desligar();
    inscricao.remove();
  };
}

/**
 * Chama `recarregar` de tempos em tempos, só com a tela em foco e o app aberto.
 * Sem empilhar: se a busca anterior não terminou, o tique é pulado.
 * O relógio é desligado ao sair da tela, ao desmontar, ao trocar o intervalo e com o app em segundo plano.
 */
export function useAtualizacaoPeriodica(recarregar: () => Promise<void>, intervaloMs: number): void {
  // Uma só proteção por `recarregar`: trocar o intervalo no meio de uma busca não abre outra.
  const buscar = useMemo(() => semEmpilhar(recarregar), [recarregar]);
  useFocusEffect(useCallback(() => iniciarAtualizacao(buscar, intervaloMs), [buscar, intervaloMs]));
}
