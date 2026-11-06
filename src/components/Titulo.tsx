import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Texto } from './ui/text';

interface Props {
  titulo: string;
  /** Frase logo abaixo do título. */
  apoio?: ReactNode;
  /** `silencio` só quando a frase é sobre a rua que não respondeu. */
  tomApoio?: 'apoio' | 'silencio';
  /** `destaque` (44) para um resultado: "Recebido.", "4 de 6". O padrão tem 30. */
  variante?: 'titulo' | 'destaque';
}

/** Título da tela e a frase de apoio. */
export function Titulo({ titulo, apoio, tomApoio = 'apoio', variante = 'titulo' }: Props) {
  return (
    <View className="mt-4 gap-2">
      <Texto variante={variante} accessibilityRole="header">
        {titulo}
      </Texto>
      {apoio ? <Texto tom={tomApoio}>{apoio}</Texto> : null}
    </View>
  );
}

/** Rótulo curto de seção: "O QUE FAZER", "PONTO DE ENCONTRO". Abre um grupo com 32 acima e 12 abaixo. */
export function Secao({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <View className="mt-8 gap-3">
      <Texto variante="rotulo" tom="rotulo" accessibilityRole="header">
        {rotulo}
      </Texto>
      {children}
    </View>
  );
}
