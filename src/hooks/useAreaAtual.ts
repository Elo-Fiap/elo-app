import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { config } from '../config';
import { lerArea } from '../db/area';
import type { Area } from '../types';

/** Área escolhida pelo usuário. Relê ao focar a tela, para refletir a troca feita no modal. */
export function useAreaAtual(): Area | null {
  const [area, setArea] = useState<Area | null>(null);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      lerArea()
        .then((a) => ativo && setArea(a))
        .catch(() => ativo && setArea(config.areaPadrao));
      return () => {
        ativo = false;
      };
    }, []),
  );

  return area;
}
