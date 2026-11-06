import { estaOnline } from './conexao';

describe('estaOnline', () => {
  it('só é falso se um dos dois disser false', () => {
    expect(estaOnline({ isConnected: false })).toBe(false);
    expect(estaOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
    expect(estaOnline({ isConnected: false, isInternetReachable: true })).toBe(false);
  });

  it('nulo (ainda não sabe) conta como online', () => {
    expect(estaOnline({ isConnected: null, isInternetReachable: null })).toBe(true);
    expect(estaOnline({ isConnected: true, isInternetReachable: null })).toBe(true);
    expect(estaOnline({ isConnected: true })).toBe(true);
  });
});
