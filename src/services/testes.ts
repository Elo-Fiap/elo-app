// Ajudantes só dos testes: fetch simulado. Nenhum teste chama a internet.
export function respostaJson(corpo: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  } as Response;
}

export function simularFetch(
  roteiro: (url: string, init?: RequestInit) => Response | Promise<Response>,
): jest.Mock {
  const mock = jest.fn(async (url: string, init?: RequestInit) => roteiro(url, init));
  (globalThis as { fetch: unknown }).fetch = mock;
  return mock;
}
