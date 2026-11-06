import { coresClaro, coresEscuro, variaveisCss, type Cores } from './cores';
import { contraste } from './contraste';
import { ALVO_TOQUE_MINIMO } from './espacamento';
import { criarTema } from './index';
import { fontes, tamanhosFonte } from './tipografia';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tailwind = require('../../tailwind.config.js');

const MINIMO_WCAG = 4.5;

function paresDeTexto(c: Cores): [string, string, string][] {
  const superficies: [string, string][] = [
    ['fundo', c.fundo],
    ['bloco', c.bloco],
    ['folha', c.folha],
    ['campo', c.campo],
    ['campoFolha', c.campoFolha],
  ];
  const pares: [string, string, string][] = [['sobreSolido/solido', c.sobreSolido, c.solido]];
  for (const [nome, fundo] of superficies) {
    pares.push([`tinta/${nome}`, c.tinta, fundo]);
    pares.push([`apoio/${nome}`, c.apoio, fundo]);
    pares.push([`rotulo/${nome}`, c.rotulo, fundo]);
  }
  pares.push(['silencio/fundo', c.silencio, c.fundo]);
  return pares;
}

describe.each([
  ['claro', coresClaro],
  ['escuro', coresEscuro],
])('contraste de texto no tema %s', (_nome, cores) => {
  it.each(paresDeTexto(cores))('%s tem pelo menos 4,5:1', (_par, frente, fundo) => {
    expect(contraste(frente, fundo)).toBeGreaterThanOrEqual(MINIMO_WCAG);
  });
});

describe('contraste()', () => {
  it('preto e branco dão 21', () => {
    expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });
  it('rejeita cor inválida', () => {
    expect(() => contraste('azul', '#FFFFFF')).toThrow();
  });
});

describe('tema', () => {
  it('corpo tem pelo menos 16 e nenhum texto passa abaixo de 12', () => {
    expect(tamanhosFonte.corpo).toBeGreaterThanOrEqual(16);
    expect(Math.min(...Object.values(tamanhosFonte))).toBeGreaterThanOrEqual(12);
  });
  it('alvo de toque é de pelo menos 48', () => {
    expect(criarTema('escuro').alvoToque).toBeGreaterThanOrEqual(48);
    expect(ALVO_TOQUE_MINIMO).toBe(48);
  });
  it('escolhe as cores pelo esquema', () => {
    expect(criarTema('escuro').cores).toBe(coresEscuro);
    expect(criarTema('claro').cores).toBe(coresClaro);
  });
});

describe('tailwind.config.js e src/theme falam a mesma língua', () => {
  const cores: Record<string, string> = tailwind.theme.extend.colors;
  const familias: Record<string, string[]> = tailwind.theme.extend.fontFamily;

  it('cada cor do Tailwind tem uma variável definida nos dois temas', () => {
    for (const valor of Object.values(cores)) {
      const nome = valor.replace(/^var\((.*)\)$/, '$1');
      expect(variaveisCss(coresEscuro)[nome]).toBeDefined();
      expect(variaveisCss(coresClaro)[nome]).toBeDefined();
    }
    expect(Object.keys(variaveisCss(coresEscuro))).toHaveLength(Object.keys(cores).length);
  });

  it('as famílias do Tailwind são as mesmas carregadas no app', () => {
    expect(Object.values(familias).map(([f]) => f).sort()).toEqual(Object.values(fontes).sort());
  });
});
