import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import type { AvisoDaRegua } from '../domain/regua';
import { useTheme } from '../theme';
import { Linha } from './Linha';
import { Texto } from './ui/text';

/** A régua passou do limite. Texto direto no fundo, sem caixa, e o atalho para o plano. */
export function AvisoRegua({ aviso, onVerPlano }: { aviso: AvisoDaRegua; onVerPlano: () => void }) {
  const { movimento } = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(movimento.medio)} className="mt-4">
      <View accessible accessibilityLabel={`${aviso.titulo}. ${aviso.apoio}`} className="gap-1">
        <Texto variante="subtitulo">{aviso.titulo}</Texto>
        <Texto tom="apoio">{aviso.apoio}</Texto>
      </View>
      <Linha titulo="Ver o plano da rua" onPress={onVerPlano} />
    </Animated.View>
  );
}
