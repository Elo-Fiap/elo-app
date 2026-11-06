import { useNetInfo } from '@react-native-community/netinfo';

import { estaOnline } from '../domain/conexao';

/** Verdadeiro até o aparelho dizer que está sem internet. */
export function useConexao(): boolean {
  return estaOnline(useNetInfo());
}
