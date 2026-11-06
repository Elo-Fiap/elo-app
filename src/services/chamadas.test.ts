import * as repositorio from '../db/chamadas';
import type { Chamada } from '../types';
import * as bairro from './bairro';
import { guardarChamada, reenviarPendentes, tentarEnviar } from './chamadas';
import { ErroServico } from './http';

jest.mock('../db/chamadas');
jest.mock('./bairro');
const salvar = jest.mocked(repositorio.salvar);
const marcarSincronizada = jest.mocked(repositorio.marcarSincronizada);
const listarPendentes = jest.mocked(repositorio.listarPendentes);
const enviarChamada = jest.mocked(bairro.enviarChamada);

const dados = { ruaId: 'rua-nova', ruaNome: 'Rua Nova', status: 'preciso_ajuda' as const, pessoas: 3, observacao: '  portão azul  ' };
const agora = new Date('2026-11-05T15:00:00.000Z');

beforeEach(() => {
  jest.resetAllMocks();
  salvar.mockResolvedValue(undefined);
  marcarSincronizada.mockResolvedValue(undefined);
});

describe('guardarChamada', () => {
  it('guarda no celular sem tocar na rede, ainda como pendente', async () => {
    const c = await guardarChamada(dados, agora);
    expect(salvar).toHaveBeenCalledTimes(1);
    expect(enviarChamada).not.toHaveBeenCalled();
    expect(c.sincronizada).toBe(false);
    expect(c.observacao).toBe('portão azul');
    expect(c.criadaEm).toBe(agora.toISOString());
  });

  it('falha ao guardar no banco: o erro chega à tela', async () => {
    salvar.mockRejectedValue(new Error('disco cheio'));
    await expect(guardarChamada(dados, agora)).rejects.toThrow('disco cheio');
  });

  it('só guarda quantas pessoas se pediu ajuda; observação vazia vira null', async () => {
    const c = await guardarChamada({ ...dados, status: 'tudo_bem', observacao: '   ' }, agora);
    expect(c.pessoas).toBeNull();
    expect(c.observacao).toBeNull();
  });
});

describe('tentarEnviar', () => {
  it('envio ok: marca como sincronizada', async () => {
    const c = await guardarChamada(dados, agora);
    await expect(tentarEnviar(c)).resolves.toBe(true);
    expect(marcarSincronizada).toHaveBeenCalledWith(c.id);
  });

  it('falha de rede: continua pendente, sem lançar erro', async () => {
    enviarChamada.mockRejectedValue(new ErroServico('rede', 'sem internet'));
    const c = await guardarChamada(dados, agora);
    await expect(tentarEnviar(c)).resolves.toBe(false);
    expect(marcarSincronizada).not.toHaveBeenCalled();
  });
});

describe('reenviarPendentes', () => {
  const pendente = (id: string): Chamada => ({
    id,
    ruaId: 'r',
    ruaNome: 'R',
    status: 'tudo_bem',
    pessoas: null,
    observacao: null,
    criadaEm: agora.toISOString(),
    sincronizada: false,
  });

  it('conta as que foram e as que faltam', async () => {
    listarPendentes.mockResolvedValue([pendente('a'), pendente('b'), pendente('c')]);
    enviarChamada
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ErroServico('timeout', 'x'))
      .mockResolvedValueOnce(undefined);
    await expect(reenviarPendentes()).resolves.toEqual({ enviadas: 2, faltam: 1 });
    expect(marcarSincronizada).toHaveBeenCalledWith('a');
    expect(marcarSincronizada).toHaveBeenCalledWith('c');
    expect(marcarSincronizada).not.toHaveBeenCalledWith('b');
  });

  it('sem pendentes não faz nada', async () => {
    listarPendentes.mockResolvedValue([]);
    await expect(reenviarPendentes()).resolves.toEqual({ enviadas: 0, faltam: 0 });
    expect(enviarChamada).not.toHaveBeenCalled();
  });
});
