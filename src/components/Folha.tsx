import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { Texto } from './ui/text';

interface Props {
  titulo: string;
  apoio?: string;
  children: ReactNode;
  /** Folha alta, com lista longa. As curtas se ajustam ao próprio conteúdo. */
  rolagem?: boolean;
}

/** Conteúdo de uma folha que sobe da parte de baixo. A folha em si é uma rota com `formSheet`. */
export function Folha({ titulo, apoio, children, rolagem = false }: Props) {
  const cabecalho = (
    <View className="gap-2">
      <Texto variante="subtitulo" accessibilityRole="header">
        {titulo}
      </Texto>
      {apoio ? <Texto tom="apoio">{apoio}</Texto> : null}
    </View>
  );

  if (rolagem) {
    return (
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-6 pb-10 pt-7"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {cabecalho}
        {children}
      </ScrollView>
    );
  }
  return (
    <View className="gap-4 px-6 pb-10 pt-7">
      {cabecalho}
      {children}
    </View>
  );
}
