import { Linking } from 'react-native';
import * as SMS from 'expo-sms';

import { abrirSms, abrirWhatsApp, ligar, urlWhatsApp } from './mensagens';

jest.mock('expo-sms');
const disponivel = jest.mocked(SMS.isAvailableAsync);
const enviar = jest.mocked(SMS.sendSMSAsync);

const chamada = { ruaNome: 'Rua Nova', status: 'agua_subindo' as const, pessoas: null, observacao: null, criadaEm: '2026-11-05T15:00:00.000Z' };

beforeEach(() => jest.resetAllMocks());

describe('abrirSms', () => {
  it('sem SMS no aparelho: indisponível e não tenta abrir', async () => {
    disponivel.mockResolvedValue(false);
    await expect(abrirSms(chamada)).resolves.toBe('indisponivel');
    expect(enviar).not.toHaveBeenCalled();
  });

  it('abre sem destinatário, com o texto pronto', async () => {
    disponivel.mockResolvedValue(true);
    enviar.mockResolvedValue({ result: 'sent' });
    await expect(abrirSms(chamada)).resolves.toBe('enviado');
    const [destinatarios, texto] = enviar.mock.calls[0];
    expect(destinatarios).toEqual([]);
    expect(texto).toContain('Rua Nova');
    // Sem API do bairro, as ruas são inventadas: a mensagem precisa dizer isso.
    expect(texto).toContain('EXEMPLO');
  });

  it('cancelado e erro nativo', async () => {
    disponivel.mockResolvedValue(true);
    enviar.mockResolvedValueOnce({ result: 'cancelled' });
    await expect(abrirSms(chamada)).resolves.toBe('cancelado');
    enviar.mockRejectedValueOnce(new Error('nativo'));
    await expect(abrirSms(chamada)).resolves.toBe('indisponivel');
  });
});

describe('WhatsApp e telefone', () => {
  it('codifica o texto na URL wa.me', () => {
    expect(urlWhatsApp('Rua Nova: água & lama')).toBe('https://wa.me/?text=Rua%20Nova%3A%20%C3%A1gua%20%26%20lama');
  });

  it('devolve false quando o aparelho não consegue abrir', async () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('sem app'));
    await expect(abrirWhatsApp('oi')).resolves.toBe(false);
    await expect(ligar('199')).resolves.toBe(false);
    abrir.mockResolvedValue(undefined);
    await expect(ligar('193')).resolves.toBe(true);
    expect(abrir).toHaveBeenLastCalledWith('tel:193');
  });
});
