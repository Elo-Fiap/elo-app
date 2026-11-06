// As cores vêm de variáveis definidas em src/theme (única fonte dos valores).
// As famílias precisam ter os mesmos nomes de `fontes`, em src/theme/tipografia.ts.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        fundo: 'var(--fundo)',
        tinta: 'var(--tinta)',
        apoio: 'var(--apoio)',
        rotulo: 'var(--rotulo)',
        bloco: 'var(--bloco)',
        folha: 'var(--folha)',
        campo: 'var(--campo)',
        'campo-folha': 'var(--campo-folha)',
        linha: 'var(--linha)',
        silencio: 'var(--silencio)',
        solido: 'var(--solido)',
        'sobre-solido': 'var(--sobre-solido)',
      },
      fontFamily: {
        titulo: ['SpaceGrotesk_700Bold'],
        rotulo: ['SpaceGrotesk_500Medium'],
        corpo: ['Manrope_400Regular'],
        'corpo-medio': ['Manrope_500Medium'],
        'corpo-forte': ['Manrope_700Bold'],
      },
    },
  },
  plugins: [],
};
