import { useColorScheme } from 'react-native';

import { coresClaro, coresEscuro, type Cores } from './cores';
import { ALVO_TOQUE_MINIMO, MARGEM, alturas, movimento, tamanhosIcone } from './espacamento';
import { fontes, tamanhosFonte } from './tipografia';

export type EsquemaCor = 'claro' | 'escuro';

export interface Tema {
  esquema: EsquemaCor;
  cores: Cores;
  fontes: typeof fontes;
  tamanhosFonte: typeof tamanhosFonte;
  margem: number;
  alturas: typeof alturas;
  tamanhosIcone: typeof tamanhosIcone;
  movimento: typeof movimento;
  alvoToque: number;
}

export function criarTema(esquema: EsquemaCor): Tema {
  return {
    esquema,
    cores: esquema === 'escuro' ? coresEscuro : coresClaro,
    fontes,
    tamanhosFonte,
    margem: MARGEM,
    alturas,
    tamanhosIcone,
    movimento,
    alvoToque: ALVO_TOQUE_MINIMO,
  };
}

const temaClaro = criarTema('claro');
const temaEscuro = criarTema('escuro');

/**
 * Tema atual, de acordo com o modo claro ou escuro do aparelho. Use para o que não
 * aceita `className`: ícone, navegador, RefreshControl. O resto usa as classes do Tailwind.
 */
export function useTheme(): Tema {
  return useColorScheme() === 'light' ? temaClaro : temaEscuro;
}

export { variaveisCss, coresClaro, coresEscuro, type Cores } from './cores';
