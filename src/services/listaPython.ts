// Item entre aspas simples ou duplas, aceitando aspas escapadas dentro dele.
const ITEM_ENTRE_ASPAS = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;

/**
 * `riscos` e `instrucoes` do INMET. No JSON real conferido em 05/11/2026 são listas de
 * verdade. A API não tem contrato publicado, então também aceitamos a lista escrita como
 * texto do Python ("['a', 'b']"). Formato inesperado vira 1 item, para o texto não se perder.
 */
export function converterListaPython(valor: unknown): string[] {
  if (Array.isArray(valor)) return limpar(valor.filter((x): x is string => typeof x === 'string'));
  if (typeof valor !== 'string') return [];

  const texto = valor.trim();
  if (texto === '' || texto === 'None' || texto === '[]') return [];
  if (!texto.startsWith('[') || !texto.endsWith(']')) return [texto];

  const itens = [...texto.matchAll(ITEM_ENTRE_ASPAS)].map((m) => (m[1] ?? m[2]).replace(/\\(.)/g, '$1'));
  return itens.length > 0 ? limpar(itens) : [texto];
}

function limpar(itens: string[]): string[] {
  return itens.map((x) => x.replace(/\s+/g, ' ').trim()).filter((x) => x !== '');
}
