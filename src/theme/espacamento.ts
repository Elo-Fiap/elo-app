/** Margem lateral da tela. Um eixo só: tudo começa aqui. */
export const MARGEM = 24;

/** Menor lado de qualquer área tocável (mínimo recomendado pelo Android e pelo WCAG 2.2). */
export const ALVO_TOQUE_MINIMO = 48;

/** Alturas fixas dos módulos. */
export const alturas = {
  toque: ALVO_TOQUE_MINIMO,
  linha: 56,
  botao: 60,
  resposta: 76,
} as const;

/** Tamanhos de ícone. Ícone nunca vem sozinho: o significado também aparece em texto. */
export const tamanhosIcone = {
  pequeno: 16,
  medio: 24,
} as const;

/** Duração dos movimentos, em milissegundos. */
export const movimento = {
  rapido: 90,
  medio: 180,
  lento: 280,
} as const;
