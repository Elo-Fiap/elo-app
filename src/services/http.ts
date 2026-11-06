export type TipoErro =
  | 'timeout'
  | 'rede'
  | 'status'
  | 'resposta_invalida'
  | 'nao_encontrado'
  | 'sem_coordenadas';

/** Erro de qualquer serviço de rede. A tela decide a mensagem pelo `tipo`. */
export class ErroServico extends Error {
  readonly tipo: TipoErro;
  readonly status?: number;

  constructor(tipo: TipoErro, mensagem: string, status?: number) {
    super(mensagem);
    this.name = 'ErroServico';
    this.tipo = tipo;
    this.status = status;
  }
}

export interface OpcoesHttp {
  /** Padrão: 10 s. Em rede ruim, o INMET (~580 KB) pede mais. */
  timeoutMs?: number;
}

const TIMEOUT_PADRAO_MS = 10_000;

async function requisitar<T>(
  url: string,
  init: RequestInit,
  { timeoutMs = TIMEOUT_PADRAO_MS }: OpcoesHttp,
): Promise<T> {
  const controle = new AbortController();
  let estourou = false;
  const relogio = setTimeout(() => {
    estourou = true;
    controle.abort();
  }, timeoutMs);

  try {
    let resposta: Response;
    try {
      resposta = await fetch(url, { ...init, signal: controle.signal });
    } catch {
      throw estourou
        ? new ErroServico('timeout', `Sem resposta em ${timeoutMs} ms`)
        : new ErroServico('rede', 'Falha de rede');
    }
    if (!resposta.ok) {
      throw new ErroServico('status', `HTTP ${resposta.status}`, resposta.status);
    }
    if (resposta.status === 204) return undefined as T;
    try {
      // O corpo também pode estourar o tempo: a leitura segue sob o mesmo AbortController.
      return (await resposta.json()) as T;
    } catch {
      throw estourou
        ? new ErroServico('timeout', `Sem resposta em ${timeoutMs} ms`)
        : new ErroServico('resposta_invalida', 'Resposta não é um JSON válido');
    }
  } finally {
    clearTimeout(relogio);
  }
}

export function getJson<T>(url: string, opcoes: OpcoesHttp = {}): Promise<T> {
  return requisitar<T>(
    url,
    { method: 'GET', headers: { Accept: 'application/json' } },
    opcoes,
  );
}

export function postJson<T = void>(url: string, corpo: unknown, opcoes: OpcoesHttp = {}): Promise<T> {
  return requisitar<T>(
    url,
    {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    },
    opcoes,
  );
}

/** Mensagem em português simples, para mostrar ao usuário. */
export function mensagemDoErro(erro: unknown): string {
  if (erro instanceof ErroServico) {
    switch (erro.tipo) {
      case 'timeout':
        return 'A internet está lenta. Tente de novo em alguns instantes.';
      case 'rede':
        return 'Sem internet no momento.';
      case 'nao_encontrado':
        return 'Não encontramos o que você procurou.';
      case 'sem_coordenadas':
        return 'Esta área não tem localização para a previsão.';
      case 'status':
      case 'resposta_invalida':
        return 'O serviço não respondeu direito. Tente de novo mais tarde.';
    }
  }
  return 'Algo deu errado. Tente de novo.';
}
