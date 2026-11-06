import { useRef } from 'react';
import { Pressable, View } from 'react-native';

import { ROTULO_STATUS } from '../domain/chamada';
import { semToqueDuplo } from '../domain/toque';
import { cn } from '../lib/utils';
import { useTheme } from '../theme';
import { STATUS_CHAMADA, type StatusChamada } from '../types';
import { Icone, type NomeIcone } from './Icone';
import { Texto } from './ui/text';

const ICONE_DA_RESPOSTA: Record<StatusChamada, NomeIcone> = {
  tudo_bem: 'tudoBem',
  agua_subindo: 'aguaSubindo',
  preciso_ajuda: 'precisoAjuda',
};

interface Props {
  /** Se devolver uma promessa, novos toques são ignorados até ela terminar. */
  onResponder: (status: StatusChamada) => unknown;
  desabilitado?: boolean;
}

/** As três respostas: o único bloco com fundo da tela, porque é o único lugar para tocar agora. */
export function Respostas({ onResponder, desabilitado = false }: Props) {
  const { cores } = useTheme();
  const ocupado = useRef(false);

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Como está sua rua" className="mx-3 mb-4 overflow-hidden rounded-[18px] bg-bloco">
      {STATUS_CHAMADA.map((status, indice) => (
        <Pressable
          key={status}
          onPress={() => void semToqueDuplo(ocupado, () => onResponder(status))}
          disabled={desabilitado}
          accessibilityRole="button"
          accessibilityLabel={ROTULO_STATUS[status]}
          accessibilityState={{ disabled: desabilitado }}
          className={cn(
            'min-h-[76px] flex-row items-center gap-4 px-3 active:opacity-60',
            indice > 0 && 'border-t border-linha',
            desabilitado && 'opacity-50',
          )}
        >
          <Icone nome={ICONE_DA_RESPOSTA[status]} cor={cores.tinta} />
          <Texto variante="resposta">{ROTULO_STATUS[status]}</Texto>
        </Pressable>
      ))}
    </View>
  );
}
