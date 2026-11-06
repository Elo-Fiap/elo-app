import { converterListaPython } from './listaPython';

describe('converterListaPython', () => {
  it('lista simples', () => {
    expect(converterListaPython("['Chuva forte.', 'Outra']")).toEqual(['Chuva forte.', 'Outra']);
  });
  it('apóstrofo no texto (Python usa aspas duplas)', () => {
    expect(converterListaPython(`["Cuidado com o d'água", 'Outra']`)).toEqual(["Cuidado com o d'água", 'Outra']);
  });
  it('vírgulas e parênteses dentro do item', () => {
    expect(converterListaPython("['Em caso de vento: (não se abrigue, ok). ', 'B']")).toEqual([
      'Em caso de vento: (não se abrigue, ok).',
      'B',
    ]);
  });
  it('aspas escapadas dentro do item', () => {
    expect(converterListaPython("['c\\'d', 'e\\\\f']")).toEqual(["c'd", 'e\\f']);
  });
  it('vazio, None e lista vazia', () => {
    expect(converterListaPython('')).toEqual([]);
    expect(converterListaPython('None')).toEqual([]);
    expect(converterListaPython('[]')).toEqual([]);
    expect(converterListaPython(null)).toEqual([]);
  });
  it('formato inesperado vira 1 item', () => {
    expect(converterListaPython('Só um texto solto')).toEqual(['Só um texto solto']);
    expect(converterListaPython('[sem aspas, nada]')).toEqual(['[sem aspas, nada]']);
    expect(converterListaPython("['aberto sem fechar]")).toEqual(["['aberto sem fechar]"]);
  });
  it('aceita array de verdade', () => {
    expect(converterListaPython(['a ', '', 'b'])).toEqual(['a', 'b']);
  });
});
