// Dados de exemplo no formato real da API do INMET (conferido em 05/11/2026).

function dataEmBrasilia(instante: number): string {
  return new Date(instante - 3 * 3_600_000).toISOString().slice(0, 10);
}

export function avisosDeExemplo(codigoIbge: string, agora: Date): unknown {
  const hoje = dataEmBrasilia(agora.getTime());
  const amanha = dataEmBrasilia(agora.getTime() + 24 * 3_600_000);
  return {
    hoje: [
      {
        id: 900001,
        encerrado: false,
        descricao: 'Tempestade',
        severidade: 'Perigo',
        inicio: `${hoje} 00:01`,
        fim: `${hoje} 23:59`,
        geocodes: `${codigoIbge},3500550`,
        riscos: [
          'Chuva entre 30 e 60 mm/h ou 50 e 100 mm/dia, ventos intensos (60-100 km/h). Risco de corte de energia elétrica, queda de galhos de árvores, alagamentos e de descargas elétricas.',
        ],
        instrucoes: [
          'Procure um abrigo e fique longe de rios e córregos. ',
          'Evite usar aparelhos eletrônicos ligados à tomada. ',
          'Em caso de emergência, ligue para o Corpo de Bombeiros (193) ou para a Defesa Civil (199).',
        ],
      },
      {
        id: 900002,
        encerrado: false,
        descricao: 'Chuvas Intensas',
        severidade: 'Perigo Potencial',
        inicio: `${hoje} 00:01`,
        fim: `${hoje} 23:59`,
        geocodes: '1200013,1300029',
        riscos: ['Chuva entre 20 e 30 mm/h ou até 50 mm/dia. Baixo risco de alagamentos.'],
        instrucoes: ['Evite atravessar áreas alagadas.'],
      },
    ],
    futuro: [
      {
        id: 900003,
        encerrado: false,
        descricao: 'Chuvas Intensas',
        severidade: 'Perigo Potencial',
        inicio: `${amanha} 00:01`,
        fim: `${amanha} 23:59`,
        geocodes: `${codigoIbge}`,
        riscos: ['Chuva entre 20 e 30 mm/h ou até 50 mm/dia, ventos intensos (40-60 km/h).'],
        instrucoes: ['Não se abrigue debaixo de árvores. ', 'Fique atento aos avisos da Defesa Civil.'],
      },
    ],
  };
}
