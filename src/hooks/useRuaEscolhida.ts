import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { lerRuaId, salvarRuaId } from '../db/rua';

/** Rua da liderança, a mesma em todas as abas: relê ao voltar para a tela e guarda quando muda. */
export function useRuaEscolhida() {
  const [ruaId, setRuaId] = useState<string | null>(null);
  /** Falso até a primeira leitura terminar: sem isso, "sem rua" apareceria por um instante. */
  const [pronta, setPronta] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      lerRuaId()
        .then((id) => {
          if (!ativo) return;
          setRuaId(id);
          setPronta(true);
        })
        .catch(() => ativo && setPronta(true));
      return () => {
        ativo = false;
      };
    }, []),
  );

  /** Termina depois de gravar: as telas relêem a rua ao voltar, então quem fecha a folha precisa esperar. */
  const escolherRua = useCallback(async (id: string) => {
    await salvarRuaId(id);
    setRuaId(id);
  }, []);

  return { ruaId, pronta, escolherRua };
}
