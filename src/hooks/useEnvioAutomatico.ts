import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { estaOnline } from '../domain/conexao';
import { envioAutomatico } from '../services/envioAutomatico';

/** Manda as respostas guardadas quando a internet volta e quando o app volta para a frente. Chame uma vez, no layout das abas. */
export function useEnvioAutomatico(): void {
  useEffect(() => {
    const rede = NetInfo.addEventListener((estado) => {
      void envioAutomatico.aoMudarConexao(estaOnline(estado));
    });
    const app = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void envioAutomatico.tentar();
    });
    return () => {
      rede();
      app.remove();
    };
  }, []);
}
