import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme';

interface Props {
  children: ReactNode;
  /** Fica preso embaixo, fora da rolagem: as respostas ou a ação principal. */
  rodape?: ReactNode;
  /** Puxar para atualizar. O indicador fica na tela até a promessa terminar. */
  onAtualizar?: () => unknown;
  /** Tela fora das abas: sem a barra embaixo, o rodapé precisa desviar da área segura. */
  semAbas?: boolean;
}

/** Tela base: fundo do tema, área segura, rolagem e a margem de 24. */
export function Tela({ children, rodape, onAtualizar, semAbas = false }: Props) {
  const { cores } = useTheme();
  const [puxando, setPuxando] = useState(false);

  // Só o gesto mostra o indicador: uma recarga de fundo não pode empurrar a tela.
  async function aoPuxar() {
    setPuxando(true);
    try {
      await onAtualizar?.();
    } finally {
      setPuxando(false);
    }
  }

  return (
    <SafeAreaView edges={semAbas ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']} style={{ flex: 1, backgroundColor: cores.fundo }}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-6"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        refreshControl={
          onAtualizar ? (
            <RefreshControl
              refreshing={puxando}
              onRefresh={() => void aoPuxar()}
              tintColor={cores.tinta}
              colors={[cores.tinta]}
              accessibilityLabel="Puxe para atualizar"
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
      {rodape}
    </SafeAreaView>
  );
}

/** Ação principal presa embaixo da tela, na margem de 24. */
export function Rodape({ children }: { children: ReactNode }) {
  return <View className="gap-2 px-6 pb-4 pt-2">{children}</View>;
}
