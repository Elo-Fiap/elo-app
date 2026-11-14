import { Linking } from 'react-native';

import { abrirNoMapa, temPosicao, urlDoMapa } from './mapas';

const rua = { nome: 'Rua das Palafitas', latitude: -23.4766, longitude: -46.4114 };

beforeEach(() => jest.clearAllMocks());

describe('urlDoMapa', () => {
  it('iOS: maps:?ll=lat,lon&q=nome', () => {
    expect(urlDoMapa(rua, 'ios')).toBe('maps:?ll=-23.4766,-46.4114&q=Rua%20das%20Palafitas');
  });

  it('Android: geo:lat,lon?q=lat,lon(nome)', () => {
    expect(urlDoMapa(rua, 'android')).toBe('geo:-23.4766,-46.4114?q=-23.4766,-46.4114(Rua%20das%20Palafitas)');
  });

  it('nome com & ou parênteses não quebra o endereço', () => {
    expect(urlDoMapa({ ...rua, nome: 'Rua A & B (2)' }, 'ios')).toContain('q=Rua%20A%20%26%20B%20(2)');
  });

  it('sem coordenada, sem endereço', () => {
    expect(urlDoMapa({ nome: 'Rua Nova' }, 'ios')).toBeNull();
    expect(urlDoMapa({ nome: 'Rua Nova', latitude: -23.4 }, 'android')).toBeNull();
  });
});

describe('temPosicao', () => {
  it('exige as duas coordenadas', () => {
    expect(temPosicao(rua)).toBe(true);
    expect(temPosicao({ nome: 'x', latitude: 0, longitude: 0 })).toBe(true);
    expect(temPosicao({ nome: 'x', latitude: -23.4 })).toBe(false);
    expect(temPosicao({ nome: 'x' })).toBe(false);
  });
});

describe('abrirNoMapa', () => {
  it('abre o endereço e devolve true', async () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await expect(abrirNoMapa(rua)).resolves.toBe(true);
    expect(abrir).toHaveBeenCalledTimes(1);
    expect(abrir.mock.calls[0][0]).toContain('-23.4766,-46.4114');
  });

  it('sem app de mapas: false, sem estourar', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('sem app'));
    await expect(abrirNoMapa(rua)).resolves.toBe(false);
  });

  it('rua sem coordenada: false e nem tenta abrir', async () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await expect(abrirNoMapa({ nome: 'Rua Nova' })).resolves.toBe(false);
    expect(abrir).not.toHaveBeenCalled();
  });
});
