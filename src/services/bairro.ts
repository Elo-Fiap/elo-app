import { config, usaApiDoBairro } from '../config';
import planosMock from '../mocks/planos.json';
import reguaMock from '../mocks/regua.json';
import situacaoMock from '../mocks/situacao.json';
import { ehStatusChamada } from '../types';
import type { Chamada, LeituraRegua, PlanoRua, Rua, SituacaoBairro } from '../types';
import { ErroServico, getJson, postJson } from './http';

// Contrato da API do bairro (C#). Detalhes em docs/contrato-api.md.
//   GET  {API}/situacao          -> SituacaoBairro
//   POST {API}/chamadas          <- Chamada
//   GET  {API}/regua             -> LeituraRegua
//   GET  {API}/ruas/{id}/plano   -> PlanoRua   (404 = rua sem plano)

const MINUTO_MS = 60_000;

// Os dados de exemplo contam a partir da abertura do app: assim a chamada de exemplo
// não "anda" a cada atualização, e a chamada feita pela pessoa continua valendo nela.
const ABERTURA_DO_APP = new Date();

function haMinutos(agora: Date, minutos: number): string {
  return new Date(agora.getTime() - minutos * MINUTO_MS).toISOString();
}

function url(caminho: string): string {
  return `${config.apiUrl}${caminho}`;
}

// Campos opcionais (aditivos): conferência rígida. Se o valor não passa, o campo fica de fora,
// e a resposta continua valendo. Resposta antiga, sem eles, é válida.

function numeroFinito(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

function textoNaoVazio(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim() !== '';
}

function dataValida(valor: unknown): valor is string {
  return textoNaoVazio(valor) && !Number.isNaN(Date.parse(valor));
}

/** Coordenada vai em par: as duas valem ou nenhuma entra. */
function lerCoordenadas(latitude: unknown, longitude: unknown): { latitude?: number; longitude?: number } {
  if (!numeroFinito(latitude) || !numeroFinito(longitude)) return {};
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return {};
  return { latitude, longitude };
}

type CamposDoBairro = Partial<
  Pick<
    SituacaoBairro,
    'bairroId' | 'cidade' | 'uf' | 'codigoIbge' | 'latitude' | 'longitude' | 'percentualSemApp' | 'semAppMedidoEm'
  >
>;

function lerCamposDoBairro(j: Record<string, unknown>): CamposDoBairro {
  const campos: CamposDoBairro = {};
  if (textoNaoVazio(j.bairroId)) campos.bairroId = j.bairroId;
  if (textoNaoVazio(j.cidade)) campos.cidade = j.cidade;
  if (typeof j.uf === 'string' && /^[A-Za-z]{2}$/.test(j.uf)) campos.uf = j.uf.toUpperCase();
  if (typeof j.codigoIbge === 'string' && /^\d{7}$/.test(j.codigoIbge)) campos.codigoIbge = j.codigoIbge;
  Object.assign(campos, lerCoordenadas(j.latitude, j.longitude));
  if (numeroFinito(j.percentualSemApp) && j.percentualSemApp >= 0 && j.percentualSemApp <= 100) {
    campos.percentualSemApp = j.percentualSemApp;
    // A data só tem sentido junto do percentual.
    if (dataValida(j.semAppMedidoEm)) campos.semAppMedidoEm = j.semAppMedidoEm;
  }
  return campos;
}

function validarSituacao(json: unknown): SituacaoBairro {
  const j = json as (Partial<SituacaoBairro> & Record<string, unknown>) | null;
  if (!j || !Array.isArray(j.ruas) || typeof j.bairro !== 'string') {
    throw new ErroServico('resposta_invalida', 'Situação do bairro fora do formato');
  }
  const ruas: Rua[] = j.ruas.map((r) => ({
    id: String(r.id),
    nome: String(r.nome),
    status: ehStatusChamada(r.status) ? r.status : null,
    respondidaEm: ehStatusChamada(r.status) && r.respondidaEm ? r.respondidaEm : null,
    ...lerCoordenadas(r.latitude, r.longitude),
  }));
  return {
    bairro: j.bairro,
    chamadaIniciadaEm: j.chamadaIniciadaEm ?? null,
    ruas,
    ...lerCamposDoBairro(j),
  };
}

type CamposDaRegua = Partial<Pick<LeituraRegua, 'ruaId' | 'latitude' | 'longitude' | 'atencaoMetros'>>;

function lerCamposDaRegua(j: Record<string, unknown>, limiteMetros: number): CamposDaRegua {
  const campos: CamposDaRegua = {};
  if (textoNaoVazio(j.ruaId)) campos.ruaId = j.ruaId;
  Object.assign(campos, lerCoordenadas(j.latitude, j.longitude));
  // O nível de atenção só faz sentido abaixo do limite.
  if (numeroFinito(j.atencaoMetros) && j.atencaoMetros > 0 && j.atencaoMetros < limiteMetros) {
    campos.atencaoMetros = j.atencaoMetros;
  }
  return campos;
}

function validarPlano(json: unknown): PlanoRua {
  const j = json as Partial<PlanoRua> | null;
  if (!j || typeof j.ruaNome !== 'string' || typeof j.pontoEncontro !== 'string' || typeof j.rotaSaida !== 'string') {
    throw new ErroServico('resposta_invalida', 'Plano da rua fora do formato');
  }
  return {
    ruaId: String(j.ruaId ?? ''),
    ruaNome: j.ruaNome,
    pontoEncontro: j.pontoEncontro,
    rotaSaida: j.rotaSaida,
    abrigo: String(j.abrigo ?? ''),
    itensParaLevar: Array.isArray(j.itensParaLevar) ? j.itensParaLevar : [],
    contatos: Array.isArray(j.contatos) ? j.contatos : [],
  };
}

export async function buscarSituacaoBairro(agora: Date = ABERTURA_DO_APP): Promise<SituacaoBairro> {
  if (usaApiDoBairro()) return validarSituacao(await getJson<unknown>(url('/situacao')));

  const { ruas, chamadaIniciadaHaMin, ...bairro } = situacaoMock;
  return {
    bairro: bairro.bairro,
    chamadaIniciadaEm: haMinutos(agora, chamadaIniciadaHaMin),
    ruas: ruas.map((r) => ({
      id: r.id,
      nome: r.nome,
      status: ehStatusChamada(r.status) ? r.status : null,
      respondidaEm: r.respondidaHaMin === null ? null : haMinutos(agora, r.respondidaHaMin),
      ...lerCoordenadas((r as { latitude?: unknown }).latitude, (r as { longitude?: unknown }).longitude),
    })),
    ...lerCamposDoBairro(bairro),
  };
}

/** Envia uma chamada ao servidor. Quem chama marca como sincronizada se não houver erro. */
export async function enviarChamada(chamada: Chamada): Promise<void> {
  if (!usaApiDoBairro()) return;
  await postJson<void>(url('/chamadas'), {
    id: chamada.id,
    ruaId: chamada.ruaId,
    status: chamada.status,
    pessoas: chamada.pessoas,
    observacao: chamada.observacao,
    criadaEm: chamada.criadaEm,
  });
}

export async function buscarLeituraRegua(agora: Date = new Date()): Promise<LeituraRegua> {
  if (usaApiDoBairro()) {
    const j = await getJson<Record<string, unknown> | null>(url('/regua'));
    if (typeof j?.nivelMetros !== 'number' || typeof j.limiteMetros !== 'number') {
      throw new ErroServico('resposta_invalida', 'Leitura da régua fora do formato');
    }
    return {
      reguaId: String(j.reguaId ?? ''),
      local: String(j.local ?? ''),
      nivelMetros: j.nivelMetros,
      limiteMetros: j.limiteMetros,
      medidaEm: String(j.medidaEm ?? ''),
      ...lerCamposDaRegua(j, j.limiteMetros),
    };
  }
  const { medidaHaMin, ...resto } = reguaMock;
  return { ...resto, medidaEm: haMinutos(agora, medidaHaMin), ...lerCamposDaRegua(resto, resto.limiteMetros) };
}

/** Plano de evacuação da rua. Rua sem plano: erro `nao_encontrado` (a tela mostra o estado vazio). */
export async function buscarPlanoRua(ruaId: string): Promise<PlanoRua> {
  if (usaApiDoBairro()) {
    try {
      return validarPlano(await getJson<unknown>(url(`/ruas/${encodeURIComponent(ruaId)}/plano`)));
    } catch (erro) {
      if (erro instanceof ErroServico && erro.status === 404) {
        throw new ErroServico('nao_encontrado', 'Rua sem plano', 404);
      }
      throw erro;
    }
  }
  const plano = (planosMock as PlanoRua[]).find((p) => p.ruaId === ruaId);
  if (!plano) throw new ErroServico('nao_encontrado', 'Rua sem plano');
  return plano;
}
