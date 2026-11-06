const ESPERA_MS = 400;

/**
 * Ignora novos toques enquanto a ação não termina, e um pouco depois: dois toques
 * rápidos não podem gravar duas chamadas nem abrir a mesma tela duas vezes.
 */
export async function semToqueDuplo(trava: { current: boolean }, acao: () => unknown): Promise<void> {
  if (trava.current) return;
  trava.current = true;
  try {
    await acao();
  } finally {
    setTimeout(() => {
      trava.current = false;
    }, ESPERA_MS);
  }
}
