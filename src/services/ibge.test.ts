import { buscarDistritos } from './ibge';
import { respostaJson, simularFetch } from './testes';

describe('buscarDistritos', () => {
  it('ordena em pt-BR (Água antes de Zona, sem acento atrapalhar)', async () => {
    const f = simularFetch(() =>
      respostaJson([
        { id: 3, nome: 'Zona Leste' },
        { id: 1, nome: 'Água Rasa' },
        { id: 2, nome: 'Butantã' },
      ]),
    );
    const r = await buscarDistritos('3550308');
    expect(f.mock.calls[0][0]).toBe('https://servicodados.ibge.gov.br/api/v1/localidades/municipios/3550308/distritos');
    expect(r.map((d) => d.nome)).toEqual(['Água Rasa', 'Butantã', 'Zona Leste']);
    expect(r[0]).toEqual({ id: '1', nome: 'Água Rasa' });
  });

  it('resposta que não é lista dá erro', async () => {
    simularFetch(() => respostaJson({ erro: 'x' }));
    await expect(buscarDistritos('3550308')).rejects.toMatchObject({ tipo: 'resposta_invalida' });
  });
});
