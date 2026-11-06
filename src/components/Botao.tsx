import { useRef } from 'react';
import { ActivityIndicator } from 'react-native';

import { semToqueDuplo } from '../domain/toque';
import { useTheme } from '../theme';
import { Button } from './ui/button';
import { Texto } from './ui/text';

interface Props {
  titulo: string;
  /** Se devolver uma promessa, novos toques são ignorados até ela terminar. */
  onPress: () => unknown;
  /** `cheio`: a ação principal, no máximo uma por tela. `texto`: as outras. */
  variante?: 'cheio' | 'texto';
  carregando?: boolean;
  /** Se faltar, o leitor de tela lê o próprio título. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Botao({
  titulo,
  onPress,
  variante = 'cheio',
  carregando = false,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const { cores } = useTheme();
  const ocupado = useRef(false);

  return (
    <Button
      variante={variante}
      disabled={carregando}
      onPress={() => void semToqueDuplo(ocupado, onPress)}
      accessibilityLabel={accessibilityLabel ?? titulo}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: carregando, busy: carregando }}
    >
      {carregando ? <ActivityIndicator color={variante === 'cheio' ? cores.sobreSolido : cores.tinta} /> : null}
      <Texto className="text-center text-[16px] leading-[24px]">{titulo}</Texto>
    </Button>
  );
}
