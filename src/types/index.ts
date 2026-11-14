export const STATUS_CHAMADA = ['tudo_bem', 'agua_subindo', 'preciso_ajuda'] as const;
export type StatusChamada = (typeof STATUS_CHAMADA)[number];

export function ehStatusChamada(valor: unknown): valor is StatusChamada {
  return typeof valor === 'string' && (STATUS_CHAMADA as readonly string[]).includes(valor);
}

/** Área de interesse do usuário. O código IBGE tem 7 dígitos, como texto. */
export interface Area {
  nome: string;
  codigoIbge: string;
  latitude?: number;
  longitude?: number;
}

/** Distrito de um município (IBGE). */
export interface Distrito {
  id: string;
  nome: string;
}

export type SeveridadeAviso = 'Perigo Potencial' | 'Perigo' | 'Grande Perigo';

/** Aviso do INMET já limpo. Datas em ISO 8601 com o fuso de Brasília (-03:00). */
export interface Aviso {
  id: string;
  titulo: string;
  severidade: SeveridadeAviso;
  /** 1 = Perigo Potencial, 2 = Perigo, 3 = Grande Perigo. */
  gravidade: 1 | 2 | 3;
  inicio: string;
  fim: string;
  quando: 'hoje' | 'futuro';
  riscos: string[];
  instrucoes: string[];
}

/** Resumo da chuva prevista nas próximas horas (Open-Meteo). */
export interface PrevisaoChuva {
  /** Quantas horas entraram na conta (0 se a previsão não cobre o período). */
  horas: number;
  totalMm: number;
  /** Maior chance de chuva no período, de 0 a 100. */
  chanceMaxima: number;
}

/**
 * Uma rua na chamada. `status` null = silêncio (ninguém respondeu nesta chamada).
 * Nunca guarda nome de morador.
 */
export interface Rua {
  id: string;
  nome: string;
  status: StatusChamada | null;
  /** ISO 8601 de quando a rua respondeu. Null junto com `status` null. */
  respondidaEm: string | null;
  /** Posição de referência da rua. Vêm sempre em par; ausentes se a API não sabe. */
  latitude?: number;
  longitude?: number;
}

export interface Chamada {
  id: string;
  ruaId: string;
  ruaNome: string;
  status: StatusChamada;
  /** Quantas pessoas, se a liderança informou. */
  pessoas: number | null;
  observacao: string | null;
  /** ISO 8601 em UTC (toISOString). */
  criadaEm: string;
  /** Já chegou ao servidor? */
  sincronizada: boolean;
}

export interface SituacaoBairro {
  bairro: string;
  /** Quando o coordenador iniciou a chamada. Null = nenhuma chamada em andamento. */
  chamadaIniciadaEm: string | null;
  ruas: Rua[];
  // Campos opcionais: a API antiga não os manda, e um valor fora do formato é descartado.
  bairroId?: string;
  cidade?: string;
  /** Sigla em maiúsculas, ex.: "SP". */
  uf?: string;
  /** Município, 7 dígitos. É o que vai em `GET /avisos?codigoIbge=`. */
  codigoIbge?: string;
  /** Centro do bairro. Vêm sempre em par. */
  latitude?: number;
  longitude?: number;
  /** De 0 a 100: % de ruas com situação conhecida em 15 min num simulado sem o app. */
  percentualSemApp?: number;
  /** ISO 8601 de quando o simulado sem o app foi medido. Só vem junto do percentual. */
  semAppMedidoEm?: string;
}

export interface ResumoBairro {
  total: number;
  tudoBem: number;
  aguaSubindo: number;
  precisoAjuda: number;
  silencio: number;
  /** Ruas que responderam até a janela (15 min) depois do início da chamada. */
  conhecidasNaJanela: number;
  /** Indicador de impacto: percentual de ruas com situação conhecida na janela. */
  percentualNaJanela: number;
}

/** Leitura da régua de nível (ESP32), repassada pela API. */
export interface LeituraRegua {
  reguaId: string;
  local: string;
  nivelMetros: number;
  limiteMetros: number;
  medidaEm: string;
  /** Rua onde a régua está (mesmo id de `GET /situacao`). */
  ruaId?: string;
  /** Posição da régua. Vêm sempre em par. */
  latitude?: number;
  longitude?: number;
  /** Nível de atenção em metros, sempre menor que `limiteMetros`. */
  atencaoMetros?: number;
}

export interface ContatoEmergencia {
  nome: string;
  telefone: string;
}

export interface PlanoRua {
  ruaId: string;
  ruaNome: string;
  pontoEncontro: string;
  rotaSaida: string;
  abrigo: string;
  itensParaLevar: string[];
  contatos: ContatoEmergencia[];
}
