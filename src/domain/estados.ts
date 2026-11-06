import type { StatusChamada } from '../types';

/** A situação da rua em terceira pessoa. Sem status é silêncio. */
export function rotuloDaRua(status: StatusChamada | null): string {
  switch (status) {
    case 'preciso_ajuda':
      return 'Precisa de ajuda';
    case 'agua_subindo':
      return 'Água subindo';
    case 'tudo_bem':
      return 'Tudo bem';
    default:
      return 'Em silêncio';
  }
}
