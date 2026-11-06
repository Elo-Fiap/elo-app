/** Só é falso se o NetInfo disser que não há rede. "Ainda não sei" (null) conta como online. */
export function estaOnline(estado: { isConnected: boolean | null; isInternetReachable?: boolean | null }): boolean {
  return estado.isConnected !== false && estado.isInternetReachable !== false;
}
