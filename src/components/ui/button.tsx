// Adaptado de React Native Reusables (MIT, Founded Labs): só as duas variantes que o Elo usa.
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';

import { cn } from '../../lib/utils';
import { ClasseDeTexto } from './text';

export const variantesDeBotao = cva('shrink-0 flex-row items-center justify-center gap-2', {
  variants: {
    variante: {
      /** O único botão cheio da tela: a ação principal. */
      cheio: 'min-h-[60px] rounded-xl bg-solido px-6 active:opacity-80',
      /** Ação secundária: só o texto, com 48 de toque. */
      texto: 'min-h-12 active:opacity-60',
    },
  },
  defaultVariants: { variante: 'cheio' },
});

const textoDoBotao = cva('', {
  variants: {
    variante: {
      cheio: 'font-corpo-forte text-sobre-solido',
      texto: 'font-corpo-medio text-tinta',
    },
  },
  defaultVariants: { variante: 'cheio' },
});

export type PropsDeBotao = ComponentProps<typeof Pressable> & VariantProps<typeof variantesDeBotao>;

export function Button({ className, variante, disabled, ...resto }: PropsDeBotao) {
  return (
    <ClasseDeTexto.Provider value={textoDoBotao({ variante })}>
      <Pressable
        accessibilityRole="button"
        className={cn(variantesDeBotao({ variante }), disabled && 'opacity-50', className)}
        disabled={disabled}
        {...resto}
      />
    </ClasseDeTexto.Provider>
  );
}
