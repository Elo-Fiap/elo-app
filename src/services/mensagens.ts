import { Linking } from 'react-native';
import * as SMS from 'expo-sms';

import { usaApiDoBairro } from '../config';
import { montarTextoSms } from '../domain/chamada';
import type { Chamada } from '../types';

export type ResultadoSms = 'enviado' | 'cancelado' | 'indisponivel';

/**
 * Abre o app de SMS do aparelho com a mensagem pronta e sem destinatário:
 * a pessoa escolhe para quem mandar. O app não envia SMS sozinho.
 */
export async function abrirSms(
  chamada: Pick<Chamada, 'ruaNome' | 'status' | 'pessoas' | 'observacao' | 'criadaEm'>,
): Promise<ResultadoSms> {
  try {
    if (!(await SMS.isAvailableAsync())) return 'indisponivel';
    const { result } = await SMS.sendSMSAsync([], montarTextoSms(chamada, !usaApiDoBairro()));
    return result === 'cancelled' ? 'cancelado' : 'enviado';
  } catch {
    return 'indisponivel';
  }
}

export function urlWhatsApp(texto: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

/** Abre o WhatsApp com o texto pronto. A pessoa escolhe o grupo. Devolve false se não abriu. */
export async function abrirWhatsApp(texto: string): Promise<boolean> {
  try {
    await Linking.openURL(urlWhatsApp(texto));
    return true;
  } catch {
    return false;
  }
}

/** Liga para o número (tel:). Devolve false se o aparelho não consegue ligar. */
export async function ligar(numero: string): Promise<boolean> {
  try {
    await Linking.openURL(`tel:${numero}`);
    return true;
  } catch {
    return false;
  }
}
