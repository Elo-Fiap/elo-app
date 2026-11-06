// Adaptado de React Native Reusables (MIT, Founded Labs): as variantes viraram a escala do Elo.
import { cva, type VariantProps } from 'class-variance-authority';
import { createContext, useContext, type ComponentProps } from 'react';
import { Text as RNText } from 'react-native';

import { cn } from '../../lib/utils';

export const variantesDeTexto = cva('', {
  variants: {
    variante: {
      destaque: 'font-titulo text-[44px] leading-[46px] tracking-[-1.1px]',
      titulo: 'font-titulo text-[30px] leading-[33px] tracking-[-0.75px]',
      subtitulo: 'font-titulo text-[20px] leading-[26px] tracking-[-0.2px]',
      marca: 'font-titulo text-[20px] leading-[24px] tracking-[-0.4px]',
      resposta: 'font-rotulo text-[20px] leading-[26px]',
      corpo: 'font-corpo text-[16px] leading-[24px]',
      medio: 'font-corpo-medio text-[16px] leading-[24px]',
      forte: 'font-corpo-forte text-[16px] leading-[24px]',
      rotulo: 'font-rotulo text-[12px] uppercase leading-[16px] tracking-[1.2px]',
    },
    tom: {
      tinta: 'text-tinta',
      apoio: 'text-apoio',
      rotulo: 'text-rotulo',
      silencio: 'text-silencio',
      sobreSolido: 'text-sobre-solido',
    },
  },
  defaultVariants: { variante: 'corpo', tom: 'tinta' },
});

// O texto acompanha a fonte do sistema. Título tem teto: sem ele, "Recebido." quebra no meio da palavra.
const TETO_DE_ESCALA = {
  destaque: 1.2,
  titulo: 1.3,
  subtitulo: 1.5,
  marca: 1.2,
  resposta: 1.6,
  corpo: 2,
  medio: 2,
  forte: 2,
  rotulo: 1.5,
} as const;

/** Classes que um componente pai passa para o texto de dentro, como o botão faz. */
export const ClasseDeTexto = createContext<string | undefined>(undefined);

export type PropsDeTexto = ComponentProps<typeof RNText> & VariantProps<typeof variantesDeTexto>;

export function Texto({ variante, tom, className, ...resto }: PropsDeTexto) {
  const herdada = useContext(ClasseDeTexto);
  return (
    <RNText
      maxFontSizeMultiplier={TETO_DE_ESCALA[variante ?? 'corpo']}
      className={cn(variantesDeTexto({ variante, tom }), herdada, className)}
      {...resto}
    />
  );
}
