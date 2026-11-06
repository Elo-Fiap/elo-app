import { Alert, Pressable, View } from 'react-native';

import { cn } from '../lib/utils';
import { ligar } from '../services/mensagens';
import { useTheme } from '../theme';
import { Icone } from './Icone';
import { Texto } from './ui/text';

async function ligarComAviso(numero: string): Promise<void> {
  if (!(await ligar(numero))) {
    Alert.alert('Não foi possível ligar', `Use outro telefone e disque ${numero}.`);
  }
}

const TELEFONES = [
  { nome: 'Defesa Civil', numero: '199' },
  { nome: 'Bombeiros', numero: '193' },
];

/** Os dois telefones. Ficam também nas telas de falha, onde a navegação pode não estar de pé. */
export function LinhasEmergencia() {
  const { cores } = useTheme();
  return (
    <View>
      {TELEFONES.map(({ nome, numero }, indice) => (
        <Pressable
          key={numero}
          onPress={() => void ligarComAviso(numero)}
          accessibilityRole="button"
          accessibilityLabel={`Ligar para ${nome === 'Bombeiros' ? 'os Bombeiros' : 'a Defesa Civil'}, ${numero}`}
          className={cn(
            'min-h-[72px] flex-row items-center gap-4 active:opacity-60',
            indice < TELEFONES.length - 1 && 'border-b border-linha',
          )}
        >
          <Icone nome="ligar" cor={cores.tinta} />
          <Texto variante="medio" className="flex-1">
            {nome}
          </Texto>
          <Texto variante="resposta">{numero}</Texto>
        </Pressable>
      ))}
    </View>
  );
}
