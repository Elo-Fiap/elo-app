import { Stack } from 'expo-router';

import { useTheme } from '../../../src/theme';

/** Pilha dentro da aba: a tela interna abre com a barra de abas ainda visível. */
export default function LayoutDaAba() {
  const { cores } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }} />;
}
