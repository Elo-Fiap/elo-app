import type { Chamada, Rua, SituacaoBairro, StatusChamada, ResumoBairro } from '../types';
import { horaCurta } from './formatar';

export const ROTULO_STATUS: Record<StatusChamada, string> = {
  tudo_bem: 'Tudo bem',
  agua_subindo: 'Água subindo',
  preciso_ajuda: 'Preciso de ajuda',
};

const MINUTO_MS = 60_000;

function instante(iso: string | null): number {
  if (!iso) return Number.NaN;
  return Date.parse(iso);
}

/** Cria um id para a chamada no aparelho (sem depender de biblioteca). */
export function criarIdChamada(agora: Date = new Date()): string {
  const aleatorio = Math.random().toString(36).slice(2, 10).padEnd(8, '0');
  return `${agora.getTime().toString(36)}-${aleatorio}`;
}

// Quem pediu ajuda primeiro, depois silêncio, água subindo, tudo bem.
const PRIORIDADE: Record<StatusChamada | 'silencio', number> = {
  preciso_ajuda: 0,
  silencio: 1,
  agua_subindo: 2,
  tudo_bem: 3,
};

/**
 * Ordena as ruas para o painel: quem pediu ajuda primeiro, depois silêncio,
 * água subindo e tudo bem. Dentro de cada grupo, o mais antigo no topo (quem nunca respondeu
 * vem antes); empate desfeito pelo nome.
 */
export function ordenarRuas(ruas: readonly Rua[]): Rua[] {
  return [...ruas].sort((a, b) => {
    const porGrupo = PRIORIDADE[a.status ?? 'silencio'] - PRIORIDADE[b.status ?? 'silencio'];
    if (porGrupo !== 0) return porGrupo;
    const ta = instante(a.respondidaEm);
    const tb = instante(b.respondidaEm);
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
    if (Number.isNaN(ta) !== Number.isNaN(tb)) return Number.isNaN(ta) ? -1 : 1;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}

/**
 * Contagens do painel e o indicador de impacto do projeto: percentual de ruas
 * com situação conhecida até `janelaMinutos` depois do início da chamada.
 */
export function resumirBairro(
  ruas: readonly Rua[],
  chamadaIniciadaEm: string | null,
  janelaMinutos = 15,
): ResumoBairro {
  const inicio = instante(chamadaIniciadaEm);
  const limite = inicio + janelaMinutos * MINUTO_MS;
  const resumo: ResumoBairro = {
    total: ruas.length,
    tudoBem: 0,
    aguaSubindo: 0,
    precisoAjuda: 0,
    silencio: 0,
    conhecidasNaJanela: 0,
    percentualNaJanela: 0,
  };
  for (const rua of ruas) {
    if (rua.status === 'tudo_bem') resumo.tudoBem++;
    else if (rua.status === 'agua_subindo') resumo.aguaSubindo++;
    else if (rua.status === 'preciso_ajuda') resumo.precisoAjuda++;
    else resumo.silencio++;

    const resposta = instante(rua.respondidaEm);
    if (rua.status !== null && resposta >= inicio && resposta <= limite) resumo.conhecidasNaJanela++;
  }
  if (ruas.length > 0) {
    resumo.percentualNaJanela = Math.round((resumo.conhecidasNaJanela / ruas.length) * 100);
  }
  return resumo;
}

/**
 * Aplica as chamadas feitas neste aparelho que o servidor ainda não mostra:
 * a chamada local, feita depois do início da chamada do bairro e depois da
 * resposta que já constava, substitui a situação da rua.
 */
export function juntarChamadasLocais(
  situacao: SituacaoBairro,
  locais: readonly Chamada[],
): SituacaoBairro {
  const inicio = instante(situacao.chamadaIniciadaEm);
  if (Number.isNaN(inicio) || locais.length === 0) return situacao;

  const maisRecente = new Map<string, Chamada>();
  for (const c of locais) {
    const t = instante(c.criadaEm);
    if (Number.isNaN(t) || t < inicio) continue;
    const atual = maisRecente.get(c.ruaId);
    if (!atual || t > instante(atual.criadaEm)) maisRecente.set(c.ruaId, c);
  }

  const ruas = situacao.ruas.map((rua): Rua => {
    const local = maisRecente.get(rua.id);
    if (!local) return rua;
    const existente = instante(rua.respondidaEm);
    if (!Number.isNaN(existente) && existente >= instante(local.criadaEm)) return rua;
    return { ...rua, status: local.status, respondidaEm: local.criadaEm };
  });
  return { ...situacao, ruas };
}

function semAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function textoPessoas(pessoas: number | null): string {
  if (pessoas === null || pessoas <= 0) return '';
  return pessoas === 1 ? '1 pessoa' : `${pessoas} pessoas`;
}

type DadosMensagem = Pick<Chamada, 'ruaNome' | 'status' | 'pessoas' | 'observacao' | 'criadaEm'>;

/**
 * Texto curto para SMS. Sem acentos para caber em mais mensagens (acento obriga
 * o SMS a usar uma codificação que reduz de 160 para 70 caracteres).
 * `exemplo` marca a mensagem: com ruas fictícias, ela não pode parecer um pedido real.
 */
export function montarTextoSms(chamada: DadosMensagem, exemplo = false): string {
  const partes = [
    exemplo ? 'EXEMPLO, nao e real' : '',
    `Elo ${horaCurta(chamada.criadaEm)}`,
    `${chamada.ruaNome}: ${ROTULO_STATUS[chamada.status].toUpperCase()}`,
    textoPessoas(chamada.pessoas),
    chamada.observacao?.trim() ?? '',
  ].filter((p) => p !== '');
  let texto = partes.join('. ') + '.';
  if (chamada.status === 'preciso_ajuda') texto += ' Emergencia: 193 ou 199.';
  return semAcentos(texto);
}

/** Texto para WhatsApp. Sempre lembra os telefones de emergência: 199 (Defesa Civil) e 193 (Bombeiros). */
export function montarTextoWhatsApp(chamada: DadosMensagem, exemplo = false): string {
  const linhas = [
    ...(exemplo ? ['*EXEMPLO: não é uma chamada real*'] : []),
    `*Elo* - ${horaCurta(chamada.criadaEm)}`,
    `*${chamada.ruaNome}*: ${ROTULO_STATUS[chamada.status]}`,
  ];
  const pessoas = textoPessoas(chamada.pessoas);
  if (pessoas) linhas.push(`Pessoas: ${pessoas}`);
  const observacao = chamada.observacao?.trim();
  if (observacao) linhas.push(`Observação: ${observacao}`);
  linhas.push('', 'Em perigo, ligue: Defesa Civil 199 ou Bombeiros 193.');
  return linhas.join('\n');
}

/** O que dizer sobre o envio. No modo de exemplo não existe servidor: "enviada" seria mentira. */
export function textoDoEnvio(sincronizada: boolean, usaApi: boolean): string {
  if (!sincronizada) return 'Falta enviar ao bairro';
  return usaApi ? 'Enviada ao bairro' : 'Modo de exemplo: não foi para nenhum servidor';
}

/**
 * Texto para colar no grupo de WhatsApp e cobrar as ruas que não responderam.
 * Lista vazia: texto vazio (não há quem chamar).
 */
export function montarTextoChamarRuas(nomes: readonly string[], exemplo = false): string {
  if (nomes.length === 0) return '';
  const quem =
    nomes.length === 1
      ? `${nomes[0]} ainda não respondeu`
      : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]} ainda não responderam`;
  return [
    ...(exemplo ? ['*EXEMPLO: não é uma chamada real*'] : []),
    `*Elo* - ${quem}.`,
    'Como está a rua? Responda pelo app ou por aqui.',
    '',
    'Em perigo, ligue: Defesa Civil 199 ou Bombeiros 193.',
  ].join('\n');
}
