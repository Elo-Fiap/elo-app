import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/** Recarrega quando a pessoa volta para a tela. A primeira abertura fica de fora: `useCarregamento` já buscou. */
export function useRecarregarAoVoltar(recarregar: () => Promise<void>): void {
  const primeira = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeira.current) {
        primeira.current = false;
        return;
      }
      void recarregar();
    }, [recarregar]),
  );
}
