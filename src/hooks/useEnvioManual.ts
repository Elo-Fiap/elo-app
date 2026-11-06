import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { usaApiDoBairro } from '../config';
import { montarTextoWhatsApp } from '../domain/chamada';
import { abrirSms, abrirWhatsApp } from '../services/mensagens';
import type { Chamada } from '../types';

type DadosParaEnvio = Pick<Chamada, 'ruaNome' | 'status' | 'pessoas' | 'observacao' | 'criadaEm'>;

/** Envio de uma chamada por SMS ou WhatsApp, escolhido pela pessoa. `recado` é o aviso a mostrar na tela. */
export function useEnvioManual() {
  const [recado, setRecado] = useState<string | null>(null);

  const enviarPorSms = useCallback(async (chamada: DadosParaEnvio) => {
    const resultado = await abrirSms(chamada);
    if (resultado === 'indisponivel') {
      setRecado('Este aparelho não envia SMS. Use o WhatsApp ou ligue 199.');
    } else if (resultado === 'cancelado') {
      setRecado('O SMS não foi enviado. A chamada continua guardada no celular.');
    } else {
      setRecado(null);
    }
  }, []);

  const enviarPorWhatsApp = useCallback(async (chamada: DadosParaEnvio) => {
    if (!(await abrirWhatsApp(montarTextoWhatsApp(chamada, !usaApiDoBairro())))) {
      Alert.alert('Não foi possível abrir o WhatsApp', 'Instale o WhatsApp ou use o SMS.');
    }
  }, []);

  const limparRecado = useCallback(() => setRecado(null), []);

  return { recado, enviarPorSms, enviarPorWhatsApp, limparRecado };
}
