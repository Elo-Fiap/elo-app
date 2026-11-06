import { ErroServico, getJson, mensagemDoErro, postJson } from './http';
import { respostaJson, simularFetch } from './testes';

describe('getJson', () => {
  it('devolve o JSON', async () => {
    simularFetch(() => respostaJson({ a: 1 }));
    await expect(getJson('https://x.test')).resolves.toEqual({ a: 1 });
  });

  it('status de erro vira ErroServico "status"', async () => {
    simularFetch(() => respostaJson({}, 503));
    await expect(getJson('https://x.test')).rejects.toMatchObject({ tipo: 'status', status: 503 });
  });

  it('falha de rede vira "rede"', async () => {
    simularFetch(() => Promise.reject(new TypeError('Network request failed')));
    await expect(getJson('https://x.test')).rejects.toMatchObject({ tipo: 'rede' });
  });

  it('JSON inválido vira "resposta_invalida"', async () => {
    simularFetch(
      () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('x'); } }) as unknown as Response,
    );
    await expect(getJson('https://x.test')).rejects.toMatchObject({ tipo: 'resposta_invalida' });
  });

  it('estoura o tempo e cancela a requisição', async () => {
    let cancelado = false;
    simularFetch(
      (_url, init) =>
        new Promise<Response>((_ok, falha) => {
          init!.signal!.addEventListener('abort', () => {
            cancelado = true;
            falha(new Error('abortado'));
          });
        }),
    );
    const erro = (await getJson('https://x.test', { timeoutMs: 20 }).catch((e: unknown) => e)) as ErroServico;
    expect(erro).toBeInstanceOf(ErroServico);
    expect(erro.tipo).toBe('timeout');
    expect(cancelado).toBe(true);
  });
});

describe('postJson', () => {
  it('envia o corpo em JSON', async () => {
    const fetchMock = simularFetch(() => respostaJson({ ok: true }));
    await postJson('https://x.test', { b: 2 });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"b":2}');
  });
});

describe('mensagemDoErro', () => {
  it('fala português simples', () => {
    expect(mensagemDoErro(new ErroServico('rede', 'x'))).toMatch(/internet/i);
    expect(mensagemDoErro(new Error('qualquer'))).toMatch(/Tente de novo/);
  });
});
