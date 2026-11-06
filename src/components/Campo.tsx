import { View, type TextInputProps } from 'react-native';

import { cn } from '../lib/utils';
import { useTheme } from '../theme';
import { Icone } from './Icone';
import { Input } from './ui/input';
import { Texto } from './ui/text';

interface Props extends Omit<TextInputProps, 'style'> {
  /** Lido pelo leitor de tela. Se `rotuloVisivel`, aparece também acima do campo. */
  rotulo: string;
  rotuloVisivel?: boolean;
  ajuda?: string;
  erro?: string | null;
  /** Mostra a lupa à esquerda. */
  busca?: boolean;
  /** Campo dentro de uma folha, que tem outro fundo. */
  naFolha?: boolean;
}

/** Campo de texto: 48 de altura, fundo próprio, ajuda e erro abaixo em texto. */
export function Campo({ rotulo, rotuloVisivel = false, ajuda, erro, busca = false, naFolha = false, multiline, ...resto }: Props) {
  const { cores } = useTheme();
  return (
    <View className="gap-2">
      {rotuloVisivel ? <Texto variante="medio">{rotulo}</Texto> : null}
      <View
        className={cn(
          'flex-row gap-2 rounded-xl px-3',
          multiline ? 'min-h-24 items-start py-3' : 'min-h-12 items-center',
          naFolha ? 'bg-campo-folha' : 'bg-campo',
        )}
      >
        {busca ? <Icone nome="buscar" cor={cores.rotulo} tamanho={20} /> : null}
        <Input
          {...resto}
          multiline={multiline}
          accessibilityLabel={rotulo}
          accessibilityHint={ajuda}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
      {erro ? (
        <Texto variante="forte" accessibilityRole="alert" accessibilityLiveRegion="polite">
          {erro}
        </Texto>
      ) : ajuda ? (
        <Texto tom="apoio">{ajuda}</Texto>
      ) : null}
    </View>
  );
}
