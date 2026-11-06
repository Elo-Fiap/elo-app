import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useTheme } from '../theme';
import { Icone } from './Icone';
import { Logo } from './Logo';
import { Texto } from './ui/text';

interface Props {
  /** Linha pequena abaixo do nome: a rua, o bairro. */
  rotulo?: string | null;
  /** Se existir, o conjunto vira um botão para trocar a rua ou a área. */
  onTrocar?: () => void;
  /** Tela sem o atalho de emergência, como o Registro. */
  semEmergencia?: boolean;
}

/** Topo das telas principais: marca, nome, rótulo e o atalho para os telefones de emergência. */
export function Topo({ rotulo, onTrocar, semEmergencia = false }: Props) {
  const router = useRouter();
  const { cores, tamanhosIcone } = useTheme();

  const conteudo = (
    <>
      <Logo altura={22} />
      <View className="shrink">
        <Texto variante="marca">Elo.</Texto>
        {rotulo ? (
          <View className="flex-row items-center gap-1">
            <Texto variante="rotulo" tom="rotulo" numberOfLines={1} className="shrink">
              {rotulo}
            </Texto>
            {onTrocar ? <Icone nome="trocar" cor={cores.rotulo} tamanho={tamanhosIcone.pequeno} /> : null}
          </View>
        ) : null}
      </View>
    </>
  );

  return (
    <View className="min-h-12 flex-row items-center justify-between gap-3">
      {onTrocar ? (
        <Pressable
          onPress={onTrocar}
          accessibilityRole="button"
          accessibilityLabel={rotulo ? `Elo. ${rotulo}. Trocar` : 'Elo. Trocar'}
          className="min-h-12 shrink flex-row items-center gap-3 active:opacity-60"
        >
          {conteudo}
        </Pressable>
      ) : (
        <View accessible accessibilityLabel={rotulo ? `Elo. ${rotulo}` : 'Elo'} className="shrink flex-row items-center gap-3">
          {conteudo}
        </View>
      )}
      {semEmergencia ? null : (
        <Pressable
          onPress={() => router.push('/emergencia')}
          accessibilityRole="button"
          accessibilityLabel="Emergência"
          accessibilityHint="Mostra os telefones da Defesa Civil e dos Bombeiros"
          className="min-h-12 justify-center active:opacity-60"
        >
          <Texto variante="medio" maxFontSizeMultiplier={1.3}>
            Emergência
          </Texto>
        </Pressable>
      )}
    </View>
  );
}

/** Topo das telas internas: só a volta. Tela interna não leva a marca. */
export function Voltar({ rotulo = 'Voltar' }: { rotulo?: string }) {
  const router = useRouter();
  const { cores } = useTheme();
  return (
    <View className="min-h-12 flex-row items-center">
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        accessibilityRole="button"
        accessibilityLabel={rotulo}
        className="h-12 w-12 justify-center active:opacity-60"
      >
        <Icone nome="voltar" cor={cores.tinta} />
      </Pressable>
    </View>
  );
}
