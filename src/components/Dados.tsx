import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../theme';
import { Icone } from './Icone';
import { Texto } from './ui/text';

/** Bloco de informação sem caixa: rótulo à esquerda, valor à direita, 32 acima. */
export function Dados({ children }: { children: ReactNode }) {
  return <View className="mt-8">{children}</View>;
}

interface PropsDado {
  rotulo: string;
  valor: string;
  /** Se existir, a linha abre outra tela: ganha a seta e 48 de toque. */
  onPress?: () => void;
  accessibilityHint?: string;
}

export function Dado({ rotulo, valor, onPress, accessibilityHint }: PropsDado) {
  const { cores, tamanhosIcone } = useTheme();
  const conteudo = (
    <>
      <Texto tom="rotulo">{rotulo}</Texto>
      <Texto className="shrink text-right">{valor}</Texto>
    </>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={`${rotulo}: ${valor}`} className="min-h-9 flex-row items-center justify-between gap-4 py-1.5">
        {conteudo}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${rotulo}: ${valor}`}
      accessibilityHint={accessibilityHint}
      className="min-h-12 flex-row items-center gap-2 py-1.5 active:opacity-60"
    >
      <Texto tom="rotulo">{rotulo}</Texto>
      <Texto className="flex-1 text-right">{valor}</Texto>
      <Icone nome="abrir" cor={cores.rotulo} tamanho={tamanhosIcone.pequeno} />
    </Pressable>
  );
}
