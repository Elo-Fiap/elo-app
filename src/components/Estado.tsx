import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { horaComH, quandoSalvo } from '../domain/formatar';
import type { ResultadoComCache } from '../services/comCache';
import { useTheme } from '../theme';
import { Botao } from './Botao';
import { Texto } from './ui/text';

type Tipo = 'carregando' | 'erro' | 'vazio';

interface Props {
  tipo: Tipo;
  /** Padrão: "Carregando…", "Algo deu errado" ou "Nada por aqui". */
  titulo?: string;
  mensagem?: string;
  /** Só no erro: mostra "Tentar de novo". */
  onTentarDeNovo?: () => unknown;
}

const TITULO_PADRAO: Record<Tipo, string> = {
  carregando: 'Carregando…',
  erro: 'Algo deu errado',
  vazio: 'Nada por aqui',
};

/** Carregando, erro e vazio: só texto, sem caixa. */
export function Estado({ tipo, titulo, mensagem, onTentarDeNovo }: Props) {
  const { cores } = useTheme();
  const textoTitulo = titulo ?? TITULO_PADRAO[tipo];

  return (
    <View className="mt-8 items-start gap-2">
      {/* Só o texto forma um grupo: um botão dentro de um grupo acessível fica fora do alcance do VoiceOver. */}
      <View
        accessible
        accessibilityRole={tipo === 'erro' ? 'alert' : undefined}
        accessibilityLiveRegion="polite"
        accessibilityLabel={mensagem ? `${textoTitulo}. ${mensagem}` : textoTitulo}
        className="gap-2"
      >
        <View className="flex-row items-center gap-2">
          {tipo === 'carregando' ? <ActivityIndicator color={cores.apoio} /> : null}
          <Texto variante={tipo === 'carregando' ? 'corpo' : 'forte'} tom={tipo === 'carregando' ? 'apoio' : 'tinta'}>
            {textoTitulo}
          </Texto>
        </View>
        {mensagem ? <Texto tom="apoio">{mensagem}</Texto> : null}
      </View>
      {tipo === 'erro' && onTentarDeNovo ? <Botao variante="texto" titulo="Tentar de novo" onPress={onTentarDeNovo} /> : null}
    </View>
  );
}

/** Frase discreta de apoio: "Dados de exemplo", "Atualizado às 21h13". */
export function Nota({ children, tom = 'rotulo' }: { children: ReactNode; tom?: 'rotulo' | 'apoio' }) {
  return (
    <Texto tom={tom} className="mt-3">
      {children}
    </Texto>
  );
}

interface PropsDadoSalvo {
  resultado: ResultadoComCache<unknown>;
  /** A última tentativa de atualizar falhou: os dados na tela são os da tentativa anterior. */
  falhouAgora?: boolean;
}

/** Avisa quando o que está na tela veio do celular e pode estar velho. Com dado fresco, não mostra nada. */
export function DadoSalvo({ resultado, falhouAgora = false }: PropsDadoSalvo) {
  if (resultado.origem !== 'cache' && !falhouAgora) return null;
  return <Nota>{`Salvo ${quandoSalvo(resultado.salvoEm, new Date(), horaComH)}, pode estar desatualizado.`}</Nota>;
}
