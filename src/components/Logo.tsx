import Svg, { Rect } from 'react-native-svg';

import { useTheme } from '../theme';

const LARGURA_POR_ALTURA = 36 / 22;

interface Props {
  /** Altura em pontos. O topo das abas usa 22; o menor tamanho é 14. */
  altura?: number;
}

/**
 * A marca do Elo: dois elos, um deles na cor do silêncio. Sempre vem com o nome ao lado,
 * por isso fica fora da leitura de tela.
 */
export function Logo({ altura = 22 }: Props) {
  const { cores } = useTheme();
  return (
    <Svg
      width={Math.round(altura * LARGURA_POR_ALTURA)}
      height={altura}
      viewBox="1 8 36 22"
      fill="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Rect x={3} y={10} width={21} height={18} rx={9} stroke={cores.tinta} strokeWidth={4} />
      <Rect x={14} y={10} width={21} height={18} rx={9} stroke={cores.silencio} strokeWidth={4} />
    </Svg>
  );
}
