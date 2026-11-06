import type { Chamada, Rua, SituacaoBairro } from '../types';
import {
  criarIdChamada,
  juntarChamadasLocais,
  montarTextoChamarRuas,
  montarTextoSms,
  montarTextoWhatsApp,
  ordenarRuas,
  resumirBairro,
  textoDoEnvio,
} from './chamada';

const INICIO = '2026-11-05T14:00:00.000Z';
const min = (m: number) => new Date(Date.parse(INICIO) + m * 60_000).toISOString();

const rua = (id: string, status: Rua['status'], respondidaDepoisDeMin: number | null): Rua => ({
  id,
  nome: id,
  status,
  respondidaEm: respondidaDepoisDeMin === null ? null : min(respondidaDepoisDeMin),
});

describe('ordenarRuas', () => {
  it('ajuda, silêncio, água subindo, tudo bem; mais antigo primeiro em cada grupo', () => {
    const ruas = [
      rua('tb-novo', 'tudo_bem', 12),
      rua('aj', 'preciso_ajuda', 5),
      rua('silencio-b', null, null),
      rua('as', 'agua_subindo', 3),
      rua('tb-antigo', 'tudo_bem', 2),
      rua('silencio-a', null, null),
      rua('aj-antigo', 'preciso_ajuda', 1),
    ];
    expect(ordenarRuas(ruas).map((r) => r.id)).toEqual([
      'aj-antigo', 'aj', 'silencio-a', 'silencio-b', 'as', 'tb-antigo', 'tb-novo',
    ]);
  });

  it('não altera a lista original', () => {
    const ruas = [rua('b', 'tudo_bem', 1), rua('a', null, null)];
    ordenarRuas(ruas);
    expect(ruas.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('lista vazia', () => {
    expect(ordenarRuas([])).toEqual([]);
  });
});

describe('resumirBairro', () => {
  const ruas = [
    rua('1', 'tudo_bem', 4),
    rua('2', 'agua_subindo', 14),
    rua('3', 'preciso_ajuda', 15),
    rua('4', 'tudo_bem', 16), // respondeu, mas fora da janela
    rua('5', null, null),
    rua('6', null, null),
  ];

  it('conta por situação e calcula o percentual na janela de 15 min', () => {
    expect(resumirBairro(ruas, INICIO, 15)).toEqual({
      total: 6,
      tudoBem: 2,
      aguaSubindo: 1,
      precisoAjuda: 1,
      silencio: 2,
      conhecidasNaJanela: 3,
      percentualNaJanela: 50,
    });
  });

  it('janela maior inclui a resposta tardia', () => {
    expect(resumirBairro(ruas, INICIO, 20).percentualNaJanela).toBe(67);
  });

  it('sem ruas ou sem chamada, percentual zero', () => {
    expect(resumirBairro([], INICIO).percentualNaJanela).toBe(0);
    expect(resumirBairro(ruas, null).conhecidasNaJanela).toBe(0);
  });

  it('resposta anterior ao início da chamada não conta', () => {
    const antes: Rua = { id: 'x', nome: 'x', status: 'tudo_bem', respondidaEm: min(-5) };
    expect(resumirBairro([antes], INICIO).conhecidasNaJanela).toBe(0);
  });
});

describe('juntarChamadasLocais', () => {
  const situacao: SituacaoBairro = {
    bairro: 'B',
    chamadaIniciadaEm: INICIO,
    ruas: [rua('a', null, null), rua('b', 'tudo_bem', 3), rua('c', null, null)],
  };
  const chamada = (ruaId: string, status: Chamada['status'], m: number, id = `${ruaId}${m}`): Chamada => ({
    id, ruaId, ruaNome: ruaId, status, pessoas: null, observacao: null, criadaEm: min(m), sincronizada: false,
  });

  it('chamada local posterior ao início substitui a situação da rua', () => {
    const r = juntarChamadasLocais(situacao, [chamada('a', 'preciso_ajuda', 6)]);
    expect(r.ruas[0]).toMatchObject({ status: 'preciso_ajuda', respondidaEm: min(6) });
    expect(r.ruas[2].status).toBeNull();
  });

  it('usa a mais recente quando há várias para a mesma rua', () => {
    const r = juntarChamadasLocais(situacao, [chamada('a', 'tudo_bem', 4), chamada('a', 'agua_subindo', 8), chamada('a', 'preciso_ajuda', 6)]);
    expect(r.ruas[0].status).toBe('agua_subindo');
  });

  it('ignora chamada anterior ao início da chamada do bairro', () => {
    const r = juntarChamadasLocais(situacao, [chamada('a', 'tudo_bem', -2)]);
    expect(r.ruas[0].status).toBeNull();
  });

  it('não troca uma resposta do servidor que é mais nova', () => {
    const r = juntarChamadasLocais(situacao, [chamada('b', 'preciso_ajuda', 2)]);
    expect(r.ruas[1]).toMatchObject({ status: 'tudo_bem', respondidaEm: min(3) });
  });

  it('sem chamada em andamento ou sem locais, devolve a mesma situação', () => {
    expect(juntarChamadasLocais({ ...situacao, chamadaIniciadaEm: null }, [chamada('a', 'tudo_bem', 4)]).ruas[0].status).toBeNull();
    expect(juntarChamadasLocais(situacao, [])).toBe(situacao);
  });

  it('não altera a situação original', () => {
    juntarChamadasLocais(situacao, [chamada('a', 'tudo_bem', 4)]);
    expect(situacao.ruas[0].status).toBeNull();
  });
});

describe('textos de mensagem', () => {
  const criadaEm = new Date(2026, 10, 5, 14, 32).toISOString();
  const base = { ruaNome: 'Rua das Flores', pessoas: 3, observacao: 'Água na calçada', criadaEm };

  it('SMS curto, sem acentos, com hora', () => {
    const t = montarTextoSms({ ...base, status: 'agua_subindo' });
    expect(t).toBe('Elo 14:32. Rua das Flores: AGUA SUBINDO. 3 pessoas. Agua na calcada.');
    expect(/[^\x00-\x7F]/.test(t)).toBe(false);
  });

  it('SMS de pedido de ajuda lembra o 193 e o 199', () => {
    const t = montarTextoSms({ ...base, status: 'preciso_ajuda' });
    expect(t).toContain('193');
    expect(t).toContain('199');
  });

  it('SMS sem pessoas nem observação', () => {
    expect(montarTextoSms({ ruaNome: 'Rua 3', status: 'tudo_bem', pessoas: null, observacao: null, criadaEm })).toBe(
      'Elo 14:32. Rua 3: TUDO BEM.',
    );
  });

  it('WhatsApp sempre traz 199 e 193, em qualquer status', () => {
    for (const status of ['tudo_bem', 'agua_subindo', 'preciso_ajuda'] as const) {
      const t = montarTextoWhatsApp({ ...base, status });
      expect(t).toContain('199');
      expect(t).toContain('193');
    }
  });

  it('WhatsApp traz rua, situação, pessoas e observação', () => {
    const t = montarTextoWhatsApp({ ...base, status: 'preciso_ajuda' });
    expect(t).toContain('*Rua das Flores*: Preciso de ajuda');
    expect(t).toContain('Pessoas: 3 pessoas');
    expect(t).toContain('Observação: Água na calçada');
  });

  it('singular de pessoa', () => {
    expect(montarTextoSms({ ruaNome: 'R', status: 'tudo_bem', pessoas: 1, observacao: null, criadaEm })).toContain('1 pessoa.');
  });

  it('com dados de exemplo, a mensagem diz que não é real', () => {
    expect(montarTextoSms({ ...base, status: 'preciso_ajuda' }, true)).toMatch(/^EXEMPLO, nao e real\./);
    expect(montarTextoWhatsApp({ ...base, status: 'preciso_ajuda' }, true)).toContain('EXEMPLO: não é uma chamada real');
    expect(montarTextoSms({ ...base, status: 'preciso_ajuda' })).not.toContain('EXEMPLO');
  });
});

describe('montarTextoChamarRuas', () => {
  const rodape = ['Como está a rua? Responda pelo app ou por aqui.', '', 'Em perigo, ligue: Defesa Civil 199 ou Bombeiros 193.'];

  it('uma rua, no singular', () => {
    expect(montarTextoChamarRuas(['Travessa 7'])).toBe(['*Elo* - Travessa 7 ainda não respondeu.', ...rodape].join('\n'));
  });

  it('duas e três ruas, no plural', () => {
    expect(montarTextoChamarRuas(['Travessa 7', 'Rua Nova'])).toContain('*Elo* - Travessa 7 e Rua Nova ainda não responderam.');
    expect(montarTextoChamarRuas(['A', 'B', 'C'])).toContain('*Elo* - A, B e C ainda não responderam.');
  });

  it('com exemplo, a primeira linha diz que não é real', () => {
    expect(montarTextoChamarRuas(['A'], true).split('\n')[0]).toBe('*EXEMPLO: não é uma chamada real*');
    expect(montarTextoChamarRuas(['A'])).not.toContain('EXEMPLO');
  });

  it('sem ruas, texto vazio', () => {
    expect(montarTextoChamarRuas([])).toBe('');
  });
});

describe('textoDoEnvio', () => {
  it('sem API, nunca diz que foi enviada', () => {
    expect(textoDoEnvio(true, true)).toBe('Enviada ao bairro');
    expect(textoDoEnvio(true, false)).toContain('Modo de exemplo');
    expect(textoDoEnvio(false, true)).toBe('Falta enviar ao bairro');
  });
});

describe('criarIdChamada', () => {
  it('gera ids diferentes', () => {
    const agora = new Date();
    expect(criarIdChamada(agora)).not.toBe(criarIdChamada(agora));
  });
});
