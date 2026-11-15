import type { AppStateStatus } from 'react-native';

import { iniciarAtualizacao, semEmpilhar, type FonteDoEstadoDoApp } from './useAtualizacaoPeriodica';

/** Uma busca que só termina quando o teste manda. */
function buscaManual() {
  const pendentes: (() => void)[] = [];
  const recarregar = jest.fn(() => new Promise<void>((resolve) => pendentes.push(resolve)));
  return { recarregar, terminar: () => pendentes.splice(0).forEach((r) => r()) };
}

function appFalso(inicial: AppStateStatus = 'active') {
  let ouvinte: ((estado: AppStateStatus) => void) | null = null;
  const remove = jest.fn();
  const app: FonteDoEstadoDoApp = {
    currentState: inicial,
    addEventListener: (_tipo, fn) => {
      ouvinte = fn;
      return { remove };
    },
  };
  return { app, remove, mudar: (estado: AppStateStatus) => ouvinte?.(estado) };
}

const passar = async (ms: number) => {
  await jest.advanceTimersByTimeAsync(ms);
};

describe('iniciarAtualizacao', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('busca a cada intervalo, sem buscar na hora', async () => {
    const buscar = jest.fn(async () => undefined);
    const parar = iniciarAtualizacao(buscar, 30_000, appFalso().app);
    expect(buscar).not.toHaveBeenCalled();
    await passar(30_000);
    expect(buscar).toHaveBeenCalledTimes(1);
    await passar(60_000);
    expect(buscar).toHaveBeenCalledTimes(3);
    parar();
  });

  it('ao desmontar, para o relógio e solta o ouvinte do app', async () => {
    const buscar = jest.fn(async () => undefined);
    const { app, remove } = appFalso();
    const parar = iniciarAtualizacao(buscar, 10_000, app);
    expect(jest.getTimerCount()).toBe(1);
    parar();
    expect(jest.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledTimes(1);
    await passar(60_000);
    expect(buscar).not.toHaveBeenCalled();
  });

  it('trocar o intervalo desliga o relógio velho e liga o novo', async () => {
    const buscar = jest.fn(async () => undefined);
    const { app } = appFalso();
    const pararLento = iniciarAtualizacao(buscar, 30_000, app);
    await passar(30_000);
    expect(buscar).toHaveBeenCalledTimes(1);

    pararLento();
    const pararRapido = iniciarAtualizacao(buscar, 10_000, app);
    expect(jest.getTimerCount()).toBe(1);
    await passar(30_000);
    expect(buscar).toHaveBeenCalledTimes(4);
    pararRapido();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('em segundo plano não busca; ao voltar, busca na hora e retoma o relógio', async () => {
    const buscar = jest.fn(async () => undefined);
    const { app, mudar } = appFalso();
    const parar = iniciarAtualizacao(buscar, 10_000, app);

    mudar('background');
    expect(jest.getTimerCount()).toBe(0);
    await passar(60_000);
    expect(buscar).not.toHaveBeenCalled();

    mudar('active');
    expect(buscar).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(1);
    await passar(10_000);
    expect(buscar).toHaveBeenCalledTimes(2);
    parar();
  });

  it('começa desligado se o app já está em segundo plano e volta quando ele abre', async () => {
    const buscar = jest.fn(async () => undefined);
    const { app, mudar } = appFalso('background');
    const parar = iniciarAtualizacao(buscar, 10_000, app);
    expect(jest.getTimerCount()).toBe(0);
    mudar('active');
    expect(jest.getTimerCount()).toBe(1);
    parar();
  });

  it('voltar para active duas vezes não liga dois relógios', async () => {
    const buscar = jest.fn(async () => undefined);
    const { app, mudar } = appFalso();
    const parar = iniciarAtualizacao(buscar, 10_000, app);
    mudar('active');
    mudar('active');
    expect(jest.getTimerCount()).toBe(1);
    parar();
  });
});

describe('semEmpilhar', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('pula o tique enquanto a busca anterior não terminou', async () => {
    const { recarregar, terminar } = buscaManual();
    const parar = iniciarAtualizacao(semEmpilhar(recarregar), 10_000, appFalso().app);

    await passar(10_000);
    await passar(10_000);
    await passar(10_000);
    expect(recarregar).toHaveBeenCalledTimes(1);

    terminar();
    await passar(10_000);
    expect(recarregar).toHaveBeenCalledTimes(2);
    parar();
  });

  it('a busca que falha também libera a próxima', async () => {
    const recarregar = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(undefined);
    const buscar = semEmpilhar(recarregar);
    await expect(buscar()).rejects.toThrow('x');
    await buscar();
    expect(recarregar).toHaveBeenCalledTimes(2);
  });

  it('trocar o intervalo no meio de uma busca não abre outra', async () => {
    const { recarregar, terminar } = buscaManual();
    const buscar = semEmpilhar(recarregar);
    const { app } = appFalso();

    const pararLento = iniciarAtualizacao(buscar, 30_000, app);
    await passar(30_000);
    expect(recarregar).toHaveBeenCalledTimes(1);

    pararLento();
    const pararRapido = iniciarAtualizacao(buscar, 10_000, app);
    await passar(30_000);
    expect(recarregar).toHaveBeenCalledTimes(1);

    terminar();
    await passar(10_000);
    expect(recarregar).toHaveBeenCalledTimes(2);
    pararRapido();
  });

  it('voltar do segundo plano durante uma busca também não empilha', async () => {
    const { recarregar, terminar } = buscaManual();
    const { app, mudar } = appFalso();
    const parar = iniciarAtualizacao(semEmpilhar(recarregar), 10_000, app);
    await passar(10_000);
    mudar('background');
    mudar('active');
    expect(recarregar).toHaveBeenCalledTimes(1);
    terminar();
    parar();
  });
});
