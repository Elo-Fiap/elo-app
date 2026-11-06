import { reenviarPendentes } from './chamadas';

type Reenviar = () => Promise<{ enviadas: number; faltam: number }>;

export function criarEnvioAutomatico(reenviar: Reenviar) {
  const ouvintes = new Set<() => void>();
  // null = ainda não sabemos; só `false` impede de tentar.
  let online: boolean | null = null;
  let tentando = false;
  // A internet voltou no meio de uma tentativa, que pode estar falhando: sem repetir, as pendentes ficariam paradas.
  let deNovo = false;

  function avisar(): void {
    for (const fn of [...ouvintes]) {
      try {
        fn();
      } catch {
        // Um ouvinte com defeito não pode impedir os outros.
      }
    }
  }

  async function rodar(): Promise<void> {
    if (tentando) return;
    tentando = true;
    do {
      deNovo = false;
      try {
        const { enviadas } = await reenviar();
        if (enviadas > 0) avisar();
      } catch {
        // Sem rede ou sem banco: as chamadas continuam pendentes e a próxima tentativa resolve.
      }
    } while (deNovo && online !== false);
    tentando = false;
  }

  return {
    /** Chame a cada mudança. Dispara ao voltar a ficar online e na primeira chamada estando online. */
    async aoMudarConexao(agoraOnline: boolean): Promise<void> {
      const antes = online;
      online = agoraOnline;
      if (!agoraOnline || antes === true) return;
      if (tentando) deNovo = true;
      await rodar();
    },
    /** Tenta de novo agora (app voltou para a frente). Só se online. */
    async tentar(): Promise<void> {
      if (online === false) return;
      await rodar();
    },
    ouvir(fn: () => void): () => void {
      ouvintes.add(fn);
      return () => {
        ouvintes.delete(fn);
      };
    },
    avisar,
  };
}

export const envioAutomatico = criarEnvioAutomatico(reenviarPendentes);
