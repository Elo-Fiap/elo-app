// Adaptado de React Native Reusables (MIT, Founded Labs).
import * as SeparatorPrimitive from '@rn-primitives/separator';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/utils';

export function Separator({ className, ...resto }: ComponentProps<typeof SeparatorPrimitive.Root>) {
  return <SeparatorPrimitive.Root decorative className={cn('h-px w-full shrink-0 bg-linha', className)} {...resto} />;
}
