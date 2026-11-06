// Única fonte de cores do app. Tudo é neutro: o dourado só aparece no silêncio.

export interface Cores {
  fundo: string;
  /** Texto principal e ícones. */
  tinta: string;
  /** Texto de apoio. */
  apoio: string;
  /** Rótulos, valores secundários e texto de exemplo dentro de campo. */
  rotulo: string;
  /** O único bloco com fundo da tela: as respostas. */
  bloco: string;
  /** Fundo das folhas que sobem da parte de baixo. */
  folha: string;
  /** Fundo de campo sobre `fundo`. */
  campo: string;
  /** Fundo de campo sobre `folha`. */
  campoFolha: string;
  /** Linha fina entre itens. Só enfeita: não precisa de contraste de texto. */
  linha: string;
  /** Rua que ainda não respondeu. Nenhuma outra coisa usa esta cor. */
  silencio: string;
  /** Fundo do botão principal. */
  solido: string;
  sobreSolido: string;
}

export const coresEscuro: Cores = {
  fundo: '#0E0E0E',
  tinta: '#F8F8F8',
  apoio: '#B4B4B4',
  rotulo: '#909090',
  bloco: '#1D1D1D',
  folha: '#1A1A1A',
  campo: '#1D1D1D',
  campoFolha: '#0E0E0E',
  linha: 'rgba(255,255,255,0.1)',
  silencio: '#FFE657',
  solido: '#F8F8F8',
  sobreSolido: '#0E0E0E',
};

export const coresClaro: Cores = {
  fundo: '#F6F6F3',
  tinta: '#141414',
  apoio: '#5B5B56',
  rotulo: '#5B5B56',
  bloco: '#FFFFFF',
  folha: '#FFFFFF',
  campo: '#FFFFFF',
  campoFolha: '#F6F6F3',
  linha: 'rgba(0,0,0,0.1)',
  silencio: '#7A5200',
  solido: '#141414',
  sobreSolido: '#FFFFFF',
};

/** Variáveis que o `tailwind.config.js` lê. A raiz do app aplica as do tema atual. */
export function variaveisCss(c: Cores): Record<string, string> {
  return {
    '--fundo': c.fundo,
    '--tinta': c.tinta,
    '--apoio': c.apoio,
    '--rotulo': c.rotulo,
    '--bloco': c.bloco,
    '--folha': c.folha,
    '--campo': c.campo,
    '--campo-folha': c.campoFolha,
    '--linha': c.linha,
    '--silencio': c.silencio,
    '--solido': c.solido,
    '--sobre-solido': c.sobreSolido,
  };
}
