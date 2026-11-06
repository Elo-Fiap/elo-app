import { reducerCarregamento, type EstadoCarregamento } from './useCarregamento';

const inicial: EstadoCarregamento<number> = { carregando: true, erro: null, dados: undefined };

describe('reducerCarregamento', () => {
  it('sucesso guarda os dados e encerra o carregamento', () => {
    expect(reducerCarregamento(inicial, { tipo: 'sucesso', dados: 7 })).toEqual({ carregando: false, erro: null, dados: 7 });
  });

  it('falha guarda o erro e mantém os dados anteriores', () => {
    const erro = new Error('x');
    const antes: EstadoCarregamento<number> = { carregando: true, erro: null, dados: 7 };
    expect(reducerCarregamento(antes, { tipo: 'falha', erro })).toEqual({ carregando: false, erro, dados: 7 });
  });

  it('ao mudar o que se pede, os dados antigos somem (o plano de outra rua não pode ficar na tela)', () => {
    const antes: EstadoCarregamento<number> = { carregando: false, erro: new Error('x'), dados: 7 };
    expect(reducerCarregamento(antes, { tipo: 'trocou' })).toEqual({ carregando: true, erro: null, dados: undefined });
  });

  it('recarregar limpa o erro e mostra o carregamento sem perder os dados', () => {
    const antes: EstadoCarregamento<number> = { carregando: false, erro: new Error('x'), dados: 7 };
    expect(reducerCarregamento(antes, { tipo: 'inicio' })).toEqual({ carregando: true, erro: null, dados: 7 });
  });
});
