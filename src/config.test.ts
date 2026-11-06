import { avisoDeExemplo, config } from './config';

describe('avisoDeExemplo', () => {
  const original = { usarMock: config.usarMock, apiUrl: config.apiUrl };
  afterEach(() => Object.assign(config, original));

  it('modo de exemplo', () => {
    config.usarMock = true;
    config.apiUrl = 'https://api.exemplo.test';
    expect(avisoDeExemplo()).toBe('Modo de exemplo: avisos, chuva e ruas são inventados.');
  });

  it('sem API do bairro', () => {
    config.usarMock = false;
    config.apiUrl = '';
    expect(avisoDeExemplo()).toBe('Ruas e números de exemplo, inventados.');
  });

  it('com a API real, nada a avisar', () => {
    config.usarMock = false;
    config.apiUrl = 'https://api.exemplo.test';
    expect(avisoDeExemplo()).toBeNull();
  });
});
