import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { AppState } from 'react-native';

/**
 * Chama `recarregar` de tempos em tempos, só com a tela em foco e o app aberto.
 * Ao voltar do segundo plano, busca na hora: o dado na tela pode estar velho.
 */
export function useAtualizacaoPeriodica(recarregar: () => Promise<void>, intervaloMs: number): void {
  useFocusEffect(
    useCallback(() => {
      let relogio: ReturnType<typeof setInterval> | null = null;
      const ligar = () => {
        relogio ??= setInterval(() => void recarregar(), intervaloMs);
      };
      const desligar = () => {
        if (relogio !== null) clearInterval(relogio);
        relogio = null;
      };

      if (AppState.currentState === 'active') ligar();
      const inscricao = AppState.addEventListener('change', (estado) => {
        if (estado === 'active') {
          ligar();
          void recarregar();
        } else {
          desligar();
        }
      });

      return () => {
        desligar();
        inscricao.remove();
      };
    }, [recarregar, intervaloMs]),
  );
}
