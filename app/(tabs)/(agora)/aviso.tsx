import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Alert, View } from 'react-native';

import {
  Botao,
  Dado,
  Dados,
  DadoSalvo,
  Estado,
  Linha,
  Nota,
  Rodape,
  Secao,
  Separator,
  Tela,
  Texto,
  Titulo,
  Voltar,
} from '../../../src/components';
import { avisoDeExemplo, config } from '../../../src/config';
import { montarTextoAviso, ordenarAvisos } from '../../../src/domain/avisoTexto';
import { ateQuando, formatarMilimetros } from '../../../src/domain/formatar';
import { useAreaAtual } from '../../../src/hooks/useAreaAtual';
import { useCarregamento } from '../../../src/hooks/useCarregamento';
import { avisosGuardados, consultarAvisos, consultarPrevisao } from '../../../src/services/consultas';
import { mensagemDoErro } from '../../../src/services/http';
import { abrirWhatsApp } from '../../../src/services/mensagens';
import type { Area, Aviso } from '../../../src/types';

export default function TelaAviso() {
  const area = useAreaAtual();
  if (!area) {
    return (
      <Tela>
        <Voltar />
        <Estado tipo="carregando" />
      </Tela>
    );
  }
  return <ConteudoAviso area={area} />;
}

function fraseDoAviso(aviso: Aviso): string {
  return `${[aviso.severidade, ateQuando(aviso.fim)].filter((p) => p !== '').join(', ')}.`;
}

function DetalhesDoAviso({ aviso }: { aviso: Aviso }) {
  return (
    <>
      {aviso.instrucoes.length > 0 ? (
        <Secao rotulo="O que fazer">
          <View className="gap-2">
            {aviso.instrucoes.map((instrucao) => (
              <Texto key={instrucao}>{instrucao}</Texto>
            ))}
          </View>
        </Secao>
      ) : null}
      {aviso.riscos.length > 0 ? (
        <Secao rotulo="Riscos">
          <View className="gap-2">
            {aviso.riscos.map((risco) => (
              <Texto key={risco}>{risco}</Texto>
            ))}
          </View>
        </Secao>
      ) : null}
    </>
  );
}

function ConteudoAviso({ area }: { area: Area }) {
  const router = useRouter();
  const semCoordenadas = area.latitude === undefined || area.longitude === undefined;
  // Abrir a tela lê o que já está salvo (o INMET pesa cerca de 580 KB); puxar para atualizar vai à rede.
  const forcarRede = useRef(false);

  const avisos = useCarregamento(async () => {
    if (!forcarRede.current) {
      const guardado = await avisosGuardados(area);
      if (guardado) return guardado;
    }
    return consultarAvisos(area);
  }, [area.codigoIbge]);
  const chuva = useCarregamento(
    async () => (semCoordenadas ? null : consultarPrevisao(area)),
    [area.latitude, area.longitude],
  );

  async function atualizarTudo() {
    forcarRede.current = true;
    try {
      await Promise.all([avisos.recarregar(), chuva.recarregar()]);
    } finally {
      forcarRede.current = false;
    }
  }

  async function mandarParaWhatsApp() {
    const dadosVelhos = avisos.dados && (avisos.dados.origem === 'cache' || avisos.erro !== null);
    const texto = montarTextoAviso(area, avisos.dados ? ordenarAvisos(avisos.dados.dados) : null, chuva.dados?.dados ?? null, {
      salvoEm: dadosVelhos ? avisos.dados?.salvoEm : null,
      exemplo: config.usarMock,
    });
    if (!(await abrirWhatsApp(texto))) {
      Alert.alert('Não foi possível abrir o WhatsApp', 'Instale o WhatsApp ou avise o bairro por outro meio.');
    }
  }

  if (!avisos.dados) {
    return (
      <Tela key="sem_dado">
        <Voltar />
        {avisos.erro ? (
          <Estado
            tipo="erro"
            titulo="Não foi possível consultar os avisos"
            mensagem={mensagemDoErro(avisos.erro)}
            onTentarDeNovo={avisos.recarregar}
          />
        ) : (
          <Estado tipo="carregando" titulo="Buscando os avisos…" />
        )}
      </Tela>
    );
  }

  const lista = ordenarAvisos(avisos.dados.dados);
  const [primeiro, ...demais] = lista;
  const exemplo = avisoDeExemplo();

  let valorDaChuva = 'Buscando…';
  if (semCoordenadas || chuva.dados === null) {
    valorDaChuva = 'Sem previsão';
  } else if (chuva.dados) {
    const { horas, totalMm, chanceMaxima } = chuva.dados.dados;
    valorDaChuva = horas === 0 ? 'Sem previsão' : `${formatarMilimetros(totalMm)} mm, até ${chanceMaxima}% de chance`;
  } else if (chuva.erro) {
    valorDaChuva = 'Sem previsão';
  }

  return (
    <Tela
      key="aviso"
      onAtualizar={atualizarTudo}
      rodape={
        <Rodape>
          <Botao
            titulo="Mandar no WhatsApp"
            accessibilityHint="Abre o WhatsApp com o aviso pronto. Você escolhe o grupo."
            onPress={mandarParaWhatsApp}
          />
        </Rodape>
      }
    >
      <Voltar />
      {primeiro ? (
        <>
          <Titulo titulo={primeiro.titulo} apoio={fraseDoAviso(primeiro)} />
          <DetalhesDoAviso aviso={primeiro} />
          {demais.map((aviso) => (
            <View key={aviso.id}>
              <Separator className="mt-8" />
              <View className="mt-8 gap-2">
                <Texto variante="subtitulo" accessibilityRole="header">
                  {aviso.titulo}
                </Texto>
                <Texto tom="apoio">{fraseDoAviso(aviso)}</Texto>
              </View>
              <DetalhesDoAviso aviso={aviso} />
            </View>
          ))}
        </>
      ) : (
        <>
          <Titulo titulo="Nenhum aviso agora." apoio="Quando o INMET emitir um aviso para a sua área, ele aparece aqui." />
          {/* "Nenhum" de um dado salvo precisa dizer de quando é logo abaixo do título. */}
          <DadoSalvo resultado={avisos.dados} falhouAgora={avisos.erro !== null} />
        </>
      )}
      <Dados>
        <Dado rotulo="Chuva em 3 horas" valor={valorDaChuva} />
        <Dado rotulo="Fonte" valor="INMET e Open-Meteo" />
      </Dados>
      <View className="mt-4">
        <Linha titulo="Emergência" ultima onPress={() => router.push('/emergencia')} />
      </View>
      <Nota>O app não cria alertas próprios. Confira sempre o aviso oficial da Defesa Civil.</Nota>
      {primeiro ? <DadoSalvo resultado={avisos.dados} falhouAgora={avisos.erro !== null} /> : null}
      {exemplo ? <Nota>{exemplo}</Nota> : null}
    </Tela>
  );
}
