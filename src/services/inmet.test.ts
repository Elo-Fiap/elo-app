import { config } from '../config';
import fixture from './__fixtures__/inmet-ativos.json';
import { buscarAvisos, normalizarAvisos, URL_AVISOS_ATIVOS } from './inmet';
import { respostaJson, simularFetch } from './testes';

const SAO_PAULO = '3550308';

describe('normalizarAvisos (fixture real)', () => {
  const avisos = normalizarAvisos(fixture, SAO_PAULO);

  it('mantém só os avisos que cobrem o código exato', () => {
    expect(avisos.map((a) => a.id).sort()).toEqual(['56272', '56273', '56278']);
  });

  it('ordena por gravidade e depois por início', () => {
    expect(avisos.map((a) => a.id)).toEqual(['56273', '56272', '56278']);
    expect(avisos[0].gravidade).toBe(2);
  });

  it('converte datas para ISO com fuso de Brasília e marca hoje/futuro', () => {
    expect(avisos[0].inicio).toBe('2026-11-05T00:01:00-03:00');
    expect(avisos[0].fim).toBe('2026-11-05T23:59:00-03:00');
    expect(avisos[2].quando).toBe('futuro');
  });

  it('riscos e instruções viram arrays e não sobra polígono nem ícone', () => {
    expect(Array.isArray(avisos[0].riscos)).toBe(true);
    expect(avisos[0].riscos[0]).toMatch(/^Chuva entre/);
    expect(avisos[0].instrucoes.length).toBeGreaterThan(1);
    expect(Object.keys(avisos[0]).sort()).toEqual(
      ['fim', 'gravidade', 'id', 'inicio', 'instrucoes', 'quando', 'riscos', 'severidade', 'titulo'].sort(),
    );
  });
});

describe('normalizarAvisos (casos de borda)', () => {
  const base = { id: '1', descricao: 'Chuvas', severidade: 'Perigo', inicio: '2026-11-05 10:00', fim: '2026-11-05 23:59', geocodes: '3550308', riscos: '[]', instrucoes: '[]' };

  it('não confunde códigos parecidos', () => {
    const json = { hoje: [{ ...base, geocodes: '355030,35503089,13550308' }], futuro: [] };
    expect(normalizarAvisos(json, SAO_PAULO)).toEqual([]);
  });

  it('ignora encerrados (texto ou booleano)', () => {
    const json = { hoje: [{ ...base, id: 'a', encerrado: 'True' }, { ...base, id: 'b', encerrado: true }, { ...base, id: 'c', encerrado: 'False' }], futuro: [] };
    expect(normalizarAvisos(json, SAO_PAULO).map((a) => a.id)).toEqual(['c']);
  });

  it('Grande Perigo vem antes de Perigo, severidade desconhecida vira Perigo Potencial', () => {
    const json = {
      hoje: [
        { ...base, id: 'p', severidade: 'Perigo' },
        { ...base, id: 'g', severidade: 'Grande Perigo' },
        { ...base, id: 'x', severidade: '???' },
      ],
      futuro: [],
    };
    const r = normalizarAvisos(json, SAO_PAULO);
    expect(r.map((a) => a.id)).toEqual(['g', 'p', 'x']);
    expect(r[2].severidade).toBe('Perigo Potencial');
  });

  it('formato inesperado em riscos vira 1 item; apóstrofo é preservado', () => {
    const json = { hoje: [{ ...base, riscos: 'Texto sem lista', instrucoes: `["Água d'alto nível", 'B']` }], futuro: [] };
    const [a] = normalizarAvisos(json, SAO_PAULO);
    expect(a.riscos).toEqual(['Texto sem lista']);
    expect(a.instrucoes).toEqual(["Água d'alto nível", 'B']);
  });

  it('não quebra com lixo', () => {
    expect(normalizarAvisos(null, SAO_PAULO)).toEqual([]);
    expect(normalizarAvisos({ hoje: 'x', futuro: [null, 3] }, SAO_PAULO)).toEqual([]);
  });

  it('remove avisos repetidos entre hoje e futuro', () => {
    const json = { hoje: [base], futuro: [base] };
    expect(normalizarAvisos(json, SAO_PAULO)).toHaveLength(1);
  });
});

describe('buscarAvisos', () => {
  afterEach(() => {
    config.usarMock = false;
    config.apiUrl = '';
  });

  it('chama a URL do INMET e normaliza', async () => {
    const fetchMock = simularFetch(() => respostaJson(fixture));
    const avisos = await buscarAvisos(SAO_PAULO);
    expect(fetchMock.mock.calls[0][0]).toBe(URL_AVISOS_ATIVOS);
    expect(avisos).toHaveLength(3);
  });

  it('com mock, não usa a rede e devolve avisos da área', async () => {
    config.usarMock = true;
    const fetchMock = simularFetch(() => respostaJson({}));
    const avisos = await buscarAvisos(SAO_PAULO, new Date('2026-11-05T15:00:00Z'));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(avisos.length).toBeGreaterThan(0);
    expect(avisos[0].gravidade).toBe(2);
    expect(avisos[0].inicio.startsWith('2026-11-05')).toBe(true);
  });

  describe('com a API do bairro', () => {
    const avisoDaApi = {
      id: '56273', titulo: 'Tempestade', severidade: 'Perigo', gravidade: 2,
      inicio: '2026-11-05T00:01:00-03:00', fim: '2026-11-05T23:59:00-03:00', quando: 'hoje',
      riscos: ['Chuva entre 30 e 60 mm/h'], instrucoes: ['Evite usar aparelhos eletrônicos ligados à tomada.'],
    };

    beforeEach(() => {
      config.apiUrl = 'https://api.test/api';
    });

    it('chama /avisos?codigoIbge= e usa a lista direto, sem normalizar', async () => {
      const f = simularFetch(() => respostaJson([avisoDaApi]));
      const avisos = await buscarAvisos(SAO_PAULO);
      expect(f).toHaveBeenCalledTimes(1);
      expect(f.mock.calls[0][0]).toBe('https://api.test/api/avisos?codigoIbge=3550308');
      expect(avisos).toEqual([avisoDaApi]);
    });

    it('lista vazia é válida: nenhum aviso para o município', async () => {
      simularFetch(() => respostaJson([]));
      await expect(buscarAvisos(SAO_PAULO)).resolves.toEqual([]);
    });

    it('descarta o item fora do formato e mantém os bons', async () => {
      simularFetch(() =>
        respostaJson([
          avisoDaApi,
          { ...avisoDaApi, id: 'x', gravidade: 9 },
          { ...avisoDaApi, id: 'y', quando: 'ontem' },
          { ...avisoDaApi, id: 'z', inicio: 'nunca' },
          null,
          'texto',
        ]),
      );
      const avisos = await buscarAvisos(SAO_PAULO);
      expect(avisos.map((a) => a.id)).toEqual(['56273']);
    });

    it('resposta que não é lista dá erro tipado (a tela usa o dado guardado)', async () => {
      simularFetch(() => respostaJson({ hoje: [], futuro: [] }));
      await expect(buscarAvisos(SAO_PAULO)).rejects.toMatchObject({ tipo: 'resposta_invalida' });
    });

    it('API fora do ar dá erro, sem cair no INMET', async () => {
      const f = simularFetch(() => respostaJson({}, 503));
      await expect(buscarAvisos(SAO_PAULO)).rejects.toMatchObject({ tipo: 'status', status: 503 });
      expect(f).toHaveBeenCalledTimes(1);
    });

    it('com mock forçado, ignora a API e usa os avisos de exemplo', async () => {
      config.usarMock = true;
      const f = simularFetch(() => respostaJson([]));
      const avisos = await buscarAvisos(SAO_PAULO, new Date('2026-11-05T15:00:00Z'));
      expect(f).not.toHaveBeenCalled();
      expect(avisos.length).toBeGreaterThan(0);
    });
  });
});
