import { buscarAreaPorCep, normalizarCep } from './cep';
import { respostaJson, simularFetch } from './testes';

const brasilApi = {
  cep: '01001000',
  city: 'São Paulo',
  neighborhood: 'Sé',
  ibge: { city: '3550308' },
  location: { type: 'Point', coordinates: { longitude: '-46.6333', latitude: '-23.55' } },
};

describe('normalizarCep', () => {
  it('aceita pontuação e rejeita tamanho errado', () => {
    expect(normalizarCep('01001-000')).toBe('01001000');
    expect(normalizarCep(' 01.001-000 ')).toBe('01001000');
    expect(normalizarCep('0100100')).toBeNull();
    expect(normalizarCep('abc')).toBeNull();
  });
});

describe('buscarAreaPorCep', () => {
  it('usa o BrasilAPI com coordenadas', async () => {
    const f = simularFetch(() => respostaJson(brasilApi));
    const area = await buscarAreaPorCep('01001-000');
    expect(f.mock.calls[0][0]).toBe('https://brasilapi.com.br/api/cep/v2/01001000');
    expect(area).toEqual({ nome: 'Sé, São Paulo', codigoIbge: '3550308', latitude: -23.55, longitude: -46.6333 });
  });

  it('coordenadas vazias ficam undefined', async () => {
    simularFetch(() => respostaJson({ ...brasilApi, location: { coordinates: {} } }));
    const area = await buscarAreaPorCep('01001000');
    expect(area.latitude).toBeUndefined();
    expect(area.longitude).toBeUndefined();
    expect(area.codigoIbge).toBe('3550308');
  });

  it('cai no ViaCEP quando o BrasilAPI falha', async () => {
    const f = simularFetch((url) =>
      url.includes('brasilapi')
        ? respostaJson({}, 500)
        : respostaJson({ localidade: 'São Paulo', bairro: 'Sé', ibge: '3550308' }),
    );
    const area = await buscarAreaPorCep('01001000');
    expect(f.mock.calls[1][0]).toBe('https://viacep.com.br/ws/01001000/json/');
    expect(area).toEqual({ nome: 'Sé, São Paulo', codigoIbge: '3550308' });
    expect('latitude' in area).toBe(false);
  });

  it('completa o código IBGE pelo ViaCEP quando o BrasilAPI não traz', async () => {
    simularFetch((url) =>
      url.includes('brasilapi')
        ? respostaJson({ ...brasilApi, ibge: undefined })
        : respostaJson({ localidade: 'São Paulo', ibge: '3550308' }),
    );
    const area = await buscarAreaPorCep('01001000');
    expect(area.codigoIbge).toBe('3550308');
    expect(area.latitude).toBe(-23.55);
  });

  it('ViaCEP com erro:true é "não encontrado"', async () => {
    simularFetch((url) => (url.includes('brasilapi') ? respostaJson({}, 404) : respostaJson({ erro: true })));
    await expect(buscarAreaPorCep('99999999')).rejects.toMatchObject({ tipo: 'nao_encontrado' });
  });

  it('CEP inválido nem chama a rede', async () => {
    const f = simularFetch(() => respostaJson({}));
    await expect(buscarAreaPorCep('123')).rejects.toMatchObject({ tipo: 'nao_encontrado' });
    expect(f).not.toHaveBeenCalled();
  });
});
