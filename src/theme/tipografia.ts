/** Nomes das famílias carregadas na raiz. Precisam bater com `fontFamily` do `tailwind.config.js`. */
export const fontes = {
  titulo: 'SpaceGrotesk_700Bold',
  rotulo: 'SpaceGrotesk_500Medium',
  corpo: 'Manrope_400Regular',
  corpoMedio: 'Manrope_500Medium',
  corpoForte: 'Manrope_700Bold',
} as const;

/** A escala inteira do app. O corpo tem 16; 12 só em rótulo curto em maiúsculas e na aba. */
export const tamanhosFonte = {
  rotulo: 12,
  corpo: 16,
  subtitulo: 20,
  titulo: 30,
  destaque: 44,
} as const;
