import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '../lib/utils';
import { useTheme } from '../theme';
import { Icone, type NomeIcone } from './Icone';
import { Texto } from './ui/text';

interface Props {
  titulo: string;
  valor?: string;
  /** `silencio` só para a rua que não respondeu. */
  tomValor?: 'apoio' | 'silencio' | 'tinta';
  /** Linha que precisa de atenção: título e valor em negrito. */
  forte?: boolean;
  /** Última linha do grupo: sem a linha fina embaixo. */
  ultima?: boolean;
  /** Ícone à esquerda. */
  icone?: NomeIcone;
  /** No lugar da seta: um elemento próprio, como o sinal de marcado. */
  direita?: ReactNode;
  onPress?: () => void;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'radio';
  selecionada?: boolean;
}

/** Linha de lista: 56 de altura, linha fina embaixo e, se tocável, a seta. Nunca uma caixa. */
export function Linha({
  titulo,
  valor,
  tomValor = 'apoio',
  forte = false,
  ultima = false,
  icone,
  direita,
  onPress,
  accessibilityHint,
  accessibilityRole = 'button',
  selecionada,
}: Props) {
  const { cores, tamanhosIcone } = useTheme();
  const classe = cn('min-h-14 flex-row items-center gap-2', !ultima && 'border-b border-linha');
  const conteudo = (
    <>
      {icone ? <Icone nome={icone} cor={cores.tinta} /> : null}
      <Texto variante={forte ? 'forte' : 'medio'} className="flex-1">
        {titulo}
      </Texto>
      {valor ? (
        <Texto variante={forte ? 'forte' : 'corpo'} tom={forte ? 'tinta' : tomValor} className="shrink text-right">
          {valor}
        </Texto>
      ) : null}
      {direita ?? (onPress ? <Icone nome="abrir" cor={cores.rotulo} tamanho={tamanhosIcone.pequeno} /> : null)}
    </>
  );
  const rotulo = valor ? `${titulo}: ${valor}` : titulo;

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={rotulo} className={classe}>
        {conteudo}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={rotulo}
      accessibilityHint={accessibilityHint}
      accessibilityState={selecionada === undefined ? undefined : { selected: selecionada, checked: selecionada }}
      className={cn(classe, 'active:opacity-60')}
    >
      {conteudo}
    </Pressable>
  );
}
