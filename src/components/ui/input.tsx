// Adaptado de React Native Reusables (MIT, Founded Labs).
import type { ComponentProps } from 'react';
import { TextInput } from 'react-native';

import { cn } from '../../lib/utils';
import { useTheme } from '../../theme';

export function Input({ className, editable, ...resto }: ComponentProps<typeof TextInput>) {
  const { cores } = useTheme();
  return (
    <TextInput
      editable={editable}
      placeholderTextColor={cores.rotulo}
      selectionColor={cores.tinta}
      cursorColor={cores.tinta}
      className={cn('min-w-0 flex-1 font-corpo text-[16px] text-tinta', editable === false && 'opacity-50', className)}
      {...resto}
    />
  );
}
