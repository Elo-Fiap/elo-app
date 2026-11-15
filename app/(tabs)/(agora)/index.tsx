import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  AvisoRegua,
  Botao,
  Dado,
  Dados,
  DadoSalvo,
  Estado,
  Linha,
  Nota,
  Respostas,
  Rodape,
  Tela,
  Titulo,
  Topo,
} from '../../../src/components';
import { avisoDeExemplo, config, usaApiDoBairro } from '../../../src/config';
import { listar } from '../../../src/db/chamadas';
import { estadoDaAgora, textoDoBairro } from '../../../src/domain/agora';
import { textoDosAvisos } from '../../../src/domain/avisoTexto';
import { ROTULO_STATUS, juntarChamadasLocais } from '../../../src/domain/chamada';
import { formatarMilimetros, horaComH } from '../../../src/domain/formatar';
import {
  ANUNCIO_INICIAL,
  avisoDaRegua,
  decidirAnuncio,
  intervaloDaRegua,
  valorDaRegua,
  type EstadoDoAnuncio,
} from '../../../src/domain/regua';
import { useAreaAtual } from '../../../src/hooks/useAreaAtual';
import { useAtualizacaoPeriodica } from '../../../src/hooks/useAtualizacaoPeriodica';
import { useCarregamento, type ResultadoCarregamento } from '../../../src/hooks/useCarregamento';
import { useConexao } from '../../../src/hooks/useConexao';
import { useEnvioManual } from '../../../src/hooks/useEnvioManual';
import { useRecarregarAoVoltar } from '../../../src/hooks/useRecarregarAoVoltar';
import { useRuaEscolhida } from '../../../src/hooks/useRuaEscolhida';
import { guardarChamada, tentarEnviar } from '../../../src/services/chamadas';
import type { ResultadoComCache } from '../../../src/services/comCache';
import {
  consultarAvisos,
  consultarPrevisao,
  consultarRegua,
  consultarSituacao,
  guardarPlanosParaOffline,
} from '../../../src/services/consultas';
import { envioAutomatico } from '../../../src/services/envioAutomatico';
import { mensagemDoErro } from '../../../src/services/http';
import { useTheme } from '../../../src/theme';
import type { Area, Aviso, Chamada, PrevisaoChuva, SituacaoBairro, StatusChamada } from '../../../src/types';

// Depois de responder, a tela muda e "Mudar resposta" cai perto de onde estava a resposta.
// Esta pausa impede que o segundo toque de um toque duplo desfaça a resposta recém-guardada.
const PAUSA_APOS_GUARDAR_MS = 800;

type Carregado<T> = ResultadoCarregamento<ResultadoComCache<T>>;

function valorDoAviso(avisos: Carregado<Aviso[]>): string {
  if (avisos.dados) {
    // Lista vazia de um dado velho não prova que não há aviso agora: nunca vira "nenhum".
    const velho = avisos.dados.origem === 'cache' || avisos.erro !== null;
    return textoDosAvisos(velho && avisos.dados.dados.length === 0 ? null : avisos.dados.dados);
  }
  return avisos.erro ? textoDosAvisos(null) : 'Buscando…';
}

function valorDaChuva(chuva: ResultadoCarregamento<ResultadoComCache<PrevisaoChuva> | null>): string {
  if (chuva.dados === null) return 'Sem previsão';
  if (chuva.dados) {
    const { horas, totalMm } = chuva.dados.dados;
    return horas === 0 ? 'Sem previsão' : `${formatarMilimetros(totalMm)} mm`;
  }
  return chuva.erro ? 'Sem previsão' : 'Buscando…';
}

/** Sem internet, avisa que a resposta fica guardada; com internet, diz de quando é o que está na tela. */
function LinhaFinal({ online, situacao }: { online: boolean; situacao: Carregado<SituacaoBairro> }) {
  if (!online) {
    return (
      <>
        <Nota>Sem internet. Sua resposta fica guardada.</Nota>
        {situacao.dados ? <DadoSalvo resultado={situacao.dados} falhouAgora={situacao.erro !== null} /> : null}
      </>
    );
  }
  if (!situacao.dados) return null;
  if (situacao.dados.origem === 'cache' || situacao.erro) {
    return <DadoSalvo resultado={situacao.dados} falhouAgora={situacao.erro !== null} />;
  }
  return <Nota>{`Atualizado às ${horaComH(situacao.dados.salvoEm)}`}</Nota>;
}

export default function TelaAgora() {
  const area = useAreaAtual();
  if (!area) {
    return (
      <Tela>
        <Estado tipo="carregando" />
      </Tela>
    );
  }
  return <ConteudoAgora area={area} />;
}

function ConteudoAgora({ area }: { area: Area }) {
  const router = useRouter();
  const { movimento } = useTheme();
  const online = useConexao();
  const semCoordenadas = area.latitude === undefined || area.longitude === undefined;

  const situacao = useCarregamento(consultarSituacao, []);
  const locais = useCarregamento(() => listar(), []);
  const avisos = useCarregamento(() => consultarAvisos(area), [area.codigoIbge]);
  const chuva = useCarregamento(
    async () => (semCoordenadas ? null : consultarPrevisao(area)),
    [area.latitude, area.longitude],
  );
  const regua = useCarregamento(consultarRegua, []);
  const { ruaId, pronta: ruaPronta } = useRuaEscolhida();
  const { recado, enviarPorSms, enviarPorWhatsApp, limparRecado } = useEnvioManual();

  const [mudando, setMudando] = useState(false);
  const [treino, setTreino] = useState<{ resposta: StatusChamada | null } | null>(null);
  const [pausaDeToque, setPausaDeToque] = useState(false);
  const [falhaAoGuardar, setFalhaAoGuardar] = useState(false);
  const planosGuardados = useRef(false);

  const { recarregar: recarregarSituacao } = situacao;
  const { recarregar: recarregarLocais } = locais;
  const { recarregar: recarregarRegua } = regua;
  const { recarregar: recarregarAvisos } = avisos;
  const { recarregar: recarregarChuva } = chuva;

  // Os avisos ficam de fora: são pesados e mudam devagar.
  const recarregarAoVoltar = useCallback(
    async () => void (await Promise.all([recarregarSituacao(), recarregarLocais(), recarregarRegua()])),
    [recarregarSituacao, recarregarLocais, recarregarRegua],
  );
  useRecarregarAoVoltar(recarregarAoVoltar);

  const leitura = regua.dados?.dados;
  useAtualizacaoPeriodica(recarregarRegua, intervaloDaRegua(leitura));

  // Cada estado da tela é uma árvore própria: o anúncio e a vibração ficam aqui para não repetir ao trocar de estado.
  // `estadoDoAnuncio` guarda a última leitura tratada; só leitura nova anuncia ou vibra (ver `decidirAnuncio`).
  const dadosDoAviso = leitura ? avisoDaRegua(leitura, new Date(), !usaApiDoBairro()) : null;
  const estadoDoAnuncio = useRef<EstadoDoAnuncio>(ANUNCIO_INICIAL);
  const buscandoRegua = regua.carregando;
  useEffect(() => {
    const decisao = decidirAnuncio(
      estadoDoAnuncio.current,
      leitura ? { medidaEm: leitura.medidaEm, aviso: dadosDoAviso } : null,
      buscandoRegua,
      Date.now(),
    );
    estadoDoAnuncio.current = decisao.proximo;
    if (decisao.anunciar && dadosDoAviso) {
      AccessibilityInfo.announceForAccessibility(`${dadosDoAviso.titulo}. ${dadosDoAviso.apoio}`);
    }
    if (decisao.vibrar) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  });

  useEffect(
    () =>
      envioAutomatico.ouvir(() => {
        void recarregarLocais();
        void recarregarSituacao();
      }),
    [recarregarLocais, recarregarSituacao],
  );

  // Com internet, guarda o plano de todas as ruas para abrir depois sem sinal. Uma vez só:
  // a situação recarrega a cada volta para a tela, e cada rua é uma requisição.
  const ruas = situacao.dados?.dados.ruas;
  const veioDaRede = situacao.dados?.origem === 'rede';
  useEffect(() => {
    if (!ruas || !veioDaRede || planosGuardados.current) return;
    planosGuardados.current = true;
    void guardarPlanosParaOffline(ruas);
  }, [ruas, veioDaRede]);

  useEffect(() => {
    if (!pausaDeToque) return;
    const relogio = setTimeout(() => setPausaDeToque(false), PAUSA_APOS_GUARDAR_MS);
    return () => clearTimeout(relogio);
  }, [pausaDeToque]);

  const listaLocais: readonly Chamada[] = locais.dados ?? [];
  const dadosSituacao = situacao.dados?.dados ?? null;
  const situacaoJunta = dadosSituacao ? juntarChamadasLocais(dadosSituacao, listaLocais) : null;
  const estado = dadosSituacao ? estadoDaAgora(dadosSituacao, ruaId, listaLocais) : null;
  const rua = estado && estado.tipo !== 'sem_rua' ? estado.rua : null;

  // A resposta nova (daqui ou da folha de ajuda) encerra o "Mudar resposta".
  const respondidaEm = estado?.tipo === 'respondida' ? estado.respondidaEm : null;
  useEffect(() => {
    setMudando(false);
  }, [respondidaEm]);

  function atualizarTudo() {
    return Promise.all([recarregarSituacao(), recarregarLocais(), recarregarAvisos(), recarregarChuva(), recarregarRegua()]);
  }

  async function responder(status: StatusChamada) {
    if (treino) {
      setTreino({ resposta: status });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      return;
    }
    if (status === 'preciso_ajuda') {
      router.push('/ajuda');
      return;
    }
    if (!rua) return;

    setFalhaAoGuardar(false);
    let chamada: Chamada;
    try {
      chamada = await guardarChamada({ ruaId: rua.id, ruaNome: rua.nome, status, pessoas: null, observacao: null });
    } catch {
      setFalhaAoGuardar(true);
      return;
    }

    // Já está guardada: a confirmação aparece na hora, sem esperar a internet.
    // A pausa vem antes da troca de tela e `mudando` só sai com a resposta nova lida:
    // sem isso, a resposta antiga apareceria por um instante com "Mudar resposta" ativo.
    limparRecado();
    setPausaDeToque(true);
    await recarregarLocais();
    setMudando(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    AccessibilityInfo.announceForAccessibility('Resposta guardada no celular');
    await tentarEnviar(chamada);
    await Promise.all([recarregarLocais(), recarregarSituacao()]);
  }

  function manterResposta() {
    setFalhaAoGuardar(false);
    setMudando(false);
  }

  // O aviso da régua fica no topo: aparece em todos os estados, inclusive carregando e erro.
  const topo = (
    <>
      <Topo rotulo={rua?.nome ?? area.nome} onTrocar={() => router.push('/area')} />
      {dadosDoAviso ? <AvisoRegua aviso={dadosDoAviso} onVerPlano={() => router.navigate('/plano')} /> : null}
    </>
  );

  // 1. Sem dado da situação: o atalho de Emergência continua no topo.
  if (!dadosSituacao || !ruaPronta || (locais.dados === undefined && locais.carregando)) {
    return (
      <Tela key="sem_dado">
        {topo}
        {situacao.erro && !situacao.dados ? (
          <Estado
            tipo="erro"
            titulo="Não foi possível ver as ruas"
            mensagem={mensagemDoErro(situacao.erro)}
            onTentarDeNovo={recarregarSituacao}
          />
        ) : (
          <Estado tipo="carregando" titulo="Buscando a situação do bairro…" />
        )}
      </Tela>
    );
  }
  if (!estado || !situacaoJunta) return null;

  const exemplo = avisoDeExemplo();
  const dadoAviso = <Dado rotulo="Aviso" valor={valorDoAviso(avisos)} onPress={() => router.push('/aviso')} />;
  const dadoRegua = <Dado rotulo="Régua" valor={valorDaRegua(leitura, regua.erro !== null, new Date())} />;
  const dadoBairro = <Dado rotulo="Bairro" valor={textoDoBairro(situacaoJunta)} />;

  // 7. Treino com resposta.
  if (treino?.resposta) {
    return (
      <Tela
        key="treino_resposta"
        rodape={
          <Rodape>
            <Botao titulo="Treinar de novo" variante="texto" onPress={() => setTreino({ resposta: null })} />
            <Botao titulo="Sair do treino" variante="texto" onPress={() => setTreino(null)} />
          </Rodape>
        }
      >
        {topo}
        <Animated.View entering={FadeIn.duration(movimento.medio)}>
          <Titulo variante="destaque" titulo="Recebido." apoio={`Treino: você respondeu ${ROTULO_STATUS[treino.resposta]}.`} />
        </Animated.View>
        <Nota>Nada foi enviado.</Nota>
      </Tela>
    );
  }

  // 4. Perguntando, mudando a resposta ou treino sem resposta.
  const perguntando = treino !== null || estado.tipo === 'perguntando' || (mudando && estado.tipo === 'respondida');
  if (perguntando) {
    const apoio = treino
      ? 'Treino: nada é enviado nem guardado.'
      : mudando
        ? 'Escolha a nova resposta.'
        : 'Sua rua está em silêncio.';
    const comBairro = treino === null || dadosSituacao.chamadaIniciadaEm !== null;
    return (
      <Tela
        key="perguntando"
        onAtualizar={atualizarTudo}
        rodape={
          <>
            <Respostas onResponder={responder} />
            {mudando && !treino ? (
              <Rodape>
                <Botao titulo="Manter a resposta" variante="texto" onPress={manterResposta} />
              </Rodape>
            ) : null}
            {treino ? (
              <Rodape>
                <Botao titulo="Sair do treino" variante="texto" onPress={() => setTreino(null)} />
              </Rodape>
            ) : null}
          </>
        }
      >
        {topo}
        <Titulo titulo="Como está sua rua agora?" apoio={apoio} tomApoio={!treino && !mudando ? 'silencio' : 'apoio'} />
        <Dados>
          {dadoAviso}
          {dadoRegua}
          {comBairro ? dadoBairro : null}
        </Dados>
        {/* No treino nada fica guardado: a frase de sem internet seria falsa. */}
        {treino && !online ? null : <LinhaFinal online={online} situacao={situacao} />}
        {exemplo ? <Nota>{exemplo}</Nota> : null}
        {falhaAoGuardar ? (
          <Estado
            tipo="erro"
            titulo="Não foi possível guardar no celular"
            mensagem="Tente de novo. Se continuar, libere espaço no celular."
          />
        ) : null}
      </Tela>
    );
  }

  // 2. Nenhuma chamada aberta.
  if (estado.tipo === 'sem_chamada') {
    return (
      <Tela key="calma" onAtualizar={atualizarTudo}>
        {topo}
        <Titulo titulo="Nenhuma chamada aberta." apoio="Quando precisar, o Elo pergunta." />
        <Dados>
          {dadoAviso}
          <Dado rotulo="Chuva em 3 horas" valor={valorDaChuva(chuva)} />
          {dadoRegua}
        </Dados>
        <View className="mt-4">
          <Linha titulo="Treinar a chamada" ultima onPress={() => setTreino({ resposta: null })} />
        </View>
        <LinhaFinal online={online} situacao={situacao} />
        {exemplo ? <Nota>{exemplo}</Nota> : null}
      </Tela>
    );
  }

  // 3. Chamada aberta, mas a pessoa ainda não escolheu a rua.
  if (estado.tipo === 'sem_rua') {
    return (
      <Tela
        key="sem_rua"
        onAtualizar={atualizarTudo}
        rodape={
          <Rodape>
            <Botao titulo="Escolher a rua" onPress={() => router.push('/area')} />
          </Rodape>
        }
      >
        {topo}
        <Titulo titulo="Qual é a sua rua?" apoio="Escolha a rua para responder à chamada." />
        <Dados>
          {dadoAviso}
          {dadoRegua}
          {dadoBairro}
        </Dados>
        <LinhaFinal online={online} situacao={situacao} />
        {exemplo ? <Nota>{exemplo}</Nota> : null}
      </Tela>
    );
  }

  // 5 e 6. Respondida.
  const horaDaResposta = horaComH(estado.respondidaEm);
  const rotuloDaResposta = ROTULO_STATUS[estado.status];
  const chamada = estado.chamada;

  if (estado.enviada) {
    return (
      <Tela
        key="recebido"
        onAtualizar={atualizarTudo}
        rodape={
          <View style={{ pointerEvents: pausaDeToque ? 'none' : 'auto' }}>
            <Rodape>
              {chamada ? <Botao titulo="Mandar no WhatsApp" variante="texto" onPress={() => enviarPorWhatsApp(chamada)} /> : null}
              <Botao titulo="Mudar resposta" variante="texto" onPress={() => setMudando(true)} />
            </Rodape>
          </View>
        }
      >
        {topo}
        <Animated.View entering={FadeIn.duration(movimento.medio)}>
          <Titulo
            variante="destaque"
            titulo="Recebido."
            apoio={
              chamada
                ? `Você respondeu ${rotuloDaResposta} às ${horaDaResposta}.`
                : `A rua já respondeu ${rotuloDaResposta} às ${horaDaResposta}.`
            }
          />
        </Animated.View>
        <Dados>
          {dadoBairro}
          {dadoRegua}
        </Dados>
        <DadoSalvo resultado={situacao.dados!} falhouAgora={situacao.erro !== null} />
        {!usaApiDoBairro() ? <Nota>Modo de exemplo: a resposta não foi para nenhum servidor.</Nota> : null}
        {config.usarMock && exemplo ? <Nota>{exemplo}</Nota> : null}
      </Tela>
    );
  }

  return (
    <Tela
      key="guardado"
      onAtualizar={atualizarTudo}
      rodape={
        <View style={{ pointerEvents: pausaDeToque ? 'none' : 'auto' }}>
          <Rodape>
            <Botao titulo="Mudar resposta" variante="texto" onPress={() => setMudando(true)} />
            {chamada ? (
              <Botao
                titulo="Enviar por SMS"
                accessibilityHint="Abre o app de mensagens com o texto pronto. Você escolhe quem recebe."
                onPress={() => enviarPorSms(chamada)}
              />
            ) : null}
          </Rodape>
        </View>
      }
    >
      {topo}
      <Animated.View entering={FadeIn.duration(movimento.medio)}>
        <Titulo variante="destaque" titulo="Guardado." apoio="Sai sozinho quando a internet voltar." />
      </Animated.View>
      <Dados>
        <Dado rotulo="Resposta" valor={`${rotuloDaResposta}, ${horaDaResposta}`} />
        {dadoRegua}
      </Dados>
      {chamada?.observacao ? <Nota>A observação vai junto na mensagem. Confira o texto antes de enviar.</Nota> : null}
      {recado ? <Nota>{recado}</Nota> : null}
      <DadoSalvo resultado={situacao.dados!} falhouAgora={situacao.erro !== null} />
      {exemplo ? <Nota>{exemplo}</Nota> : null}
    </Tela>
  );
}
