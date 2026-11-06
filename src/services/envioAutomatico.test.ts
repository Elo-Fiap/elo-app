import { criarEnvioAutomatico } from './envioAutomatico';

// O módulo importa './chamadas', que importa o banco: aqui só interessa a fábrica.
jest.mock('./chamadas', () => ({ reenviarPendentes: jest.fn() }));

const feito = (enviadas: number) => jest.fn(async () => ({ enviadas, faltam: 0 }));

describe('envio automático', () => {
  it('dispara na primeira chamada estando online e ao voltar a ficar online', async () => {
    const reenviar = feito(0);
    const envio = criarEnvioAutomatico(reenviar);
    await envio.aoMudarConexao(true);
    expect(reenviar).toHaveBeenCalledTimes(1);
    await envio.aoMudarConexao(true);
    expect(reenviar).toHaveBeenCalledTimes(1);
    await envio.aoMudarConexao(false);
    expect(reenviar).toHaveBeenCalledTimes(1);
    await envio.aoMudarConexao(true);
    expect(reenviar).toHaveBeenCalledTimes(2);
  });

  it('começar offline não dispara', async () => {
    const reenviar = feito(0);
    const envio = criarEnvioAutomatico(reenviar);
    await envio.aoMudarConexao(false);
    expect(reenviar).not.toHaveBeenCalled();
  });

  it('tentar não faz nada offline e faz online', async () => {
    const reenviar = feito(0);
    const envio = criarEnvioAutomatico(reenviar);
    await envio.aoMudarConexao(false);
    await envio.tentar();
    expect(reenviar).not.toHaveBeenCalled();
    await envio.aoMudarConexao(true);
    await envio.tentar();
    expect(reenviar).toHaveBeenCalledTimes(2);
  });

  it('nunca há duas tentativas ao mesmo tempo', async () => {
    let liberar: (v: { enviadas: number; faltam: number }) => void = () => undefined;
    const reenviar = jest
      .fn<Promise<{ enviadas: number; faltam: number }>, []>()
      .mockImplementationOnce(() => new Promise((r) => (liberar = r)))
      .mockResolvedValue({ enviadas: 0, faltam: 0 });
    const envio = criarEnvioAutomatico(reenviar);
    const primeira = envio.tentar();
    await envio.tentar();
    expect(reenviar).toHaveBeenCalledTimes(1);
    liberar({ enviadas: 0, faltam: 0 });
    await primeira;
    await envio.tentar();
    expect(reenviar).toHaveBeenCalledTimes(2);
  });

  it('a internet volta no meio de uma tentativa: repete uma vez, sem sobrepor', async () => {
    let liberar: (v: { enviadas: number; faltam: number }) => void = () => undefined;
    const reenviar = jest
      .fn<Promise<{ enviadas: number; faltam: number }>, []>()
      .mockImplementationOnce(() => new Promise((r) => (liberar = r)))
      .mockResolvedValue({ enviadas: 0, faltam: 1 });
    const envio = criarEnvioAutomatico(reenviar);
    const primeira = envio.tentar();
    await envio.aoMudarConexao(false);
    await envio.aoMudarConexao(true);
    expect(reenviar).toHaveBeenCalledTimes(1);
    liberar({ enviadas: 0, faltam: 1 });
    await primeira;
    expect(reenviar).toHaveBeenCalledTimes(2);
  });

  it('caiu de novo antes de a tentativa terminar: não repete', async () => {
    let liberar: (v: { enviadas: number; faltam: number }) => void = () => undefined;
    const reenviar = jest
      .fn<Promise<{ enviadas: number; faltam: number }>, []>()
      .mockImplementationOnce(() => new Promise((r) => (liberar = r)))
      .mockResolvedValue({ enviadas: 0, faltam: 1 });
    const envio = criarEnvioAutomatico(reenviar);
    const primeira = envio.tentar();
    await envio.aoMudarConexao(true);
    await envio.aoMudarConexao(false);
    liberar({ enviadas: 0, faltam: 1 });
    await primeira;
    expect(reenviar).toHaveBeenCalledTimes(1);
  });

  it('erro não escapa e libera a próxima tentativa', async () => {
    const reenviar = jest.fn().mockRejectedValueOnce(new Error('banco')).mockResolvedValue({ enviadas: 0, faltam: 0 });
    const envio = criarEnvioAutomatico(reenviar);
    await expect(envio.tentar()).resolves.toBeUndefined();
    await envio.tentar();
    expect(reenviar).toHaveBeenCalledTimes(2);
  });

  it('só avisa quem ouve se enviou alguma', async () => {
    const ouvinte = jest.fn();
    const nada = criarEnvioAutomatico(feito(0));
    nada.ouvir(ouvinte);
    await nada.tentar();
    expect(ouvinte).not.toHaveBeenCalled();

    const algo = criarEnvioAutomatico(feito(2));
    algo.ouvir(ouvinte);
    await algo.tentar();
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it('ouvir devolve a função que para de ouvir; avisar chama todos, mesmo se um quebrar', () => {
    const envio = criarEnvioAutomatico(feito(0));
    const a = jest.fn(() => {
      throw new Error('ouvinte ruim');
    });
    const b = jest.fn();
    envio.ouvir(a);
    const parar = envio.ouvir(b);
    envio.avisar();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    parar();
    envio.avisar();
    expect(b).toHaveBeenCalledTimes(1);
  });
});
