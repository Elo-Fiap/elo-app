import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
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
  Tela,
  Titulo,
  Topo,
} from '../../../src/components';
import { avisoDeExemplo, config, usaApiDoBairro } from '../../../src/config';
import { listarVisitas } from '../../../src/db/visitas';
import { montarTextoChamarRuas, ordenarRuas, resumirBairro } from '../../../src/domain/chamada';
import { rotuloDaRua } from '../../../src/domain/estados';
import { textoDuracao, textoSemApp } from '../../../src/domain/formatar';
import { intervaloDaRegua, notaDaMedida, valorDaRegua } from '../../../src/domain/regua';
import { useAtualizacaoPeriodica } from '../../../src/hooks/useAtualizacaoPeriodica';
import { useCarregamento } from '../../../src/hooks/useCarregamento';
import { useRecarregarAoVoltar } from '../../../src/hooks/useRecarregarAoVoltar';
import { consultarRegua, consultarSituacaoComLocais } from '../../../src/services/consultas';
import { envioAutomatico } from '../../../src/services/envioAutomatico';
import { mensagemDoErro } from '../../../src/services/http';
import { abrirWhatsApp } from '../../../src/services/mensagens';

export default function TelaBairro() {
  const router = useRouter();
  const situacao = useCarregamento(consultarSituacaoComLocais, []);
  const regua = useCarregamento(consultarRegua, []);

  const chamadaIniciadaEm = situacao.dados?.dados.chamadaIniciadaEm ?? null;
  // Marcar visita é um extra: se o banco falhar, a lista continua valendo.
  const visitas = useCarregamento(
    async () => (chamadaIniciadaEm ? await listarVisitas(chamadaIniciadaEm).catch((): string[] => []) : []),
    [chamadaIniciadaEm],
  );

  const { recarregar: recarregarSituacao } = situacao;
  const { recarregar: recarregarRegua } = regua;
  const { recarregar: recarregarVisitas } = visitas;

  const recarregarTudo = useCallback(
    async () => void (await Promise.all([recarregarSituacao(), recarregarRegua(), recarregarVisitas()])),
    [recarregarSituacao, recarregarRegua, recarregarVisitas],
  );

  // Ao voltar para a aba, relê: uma resposta guardada em "Agora" ou uma visita marcada na rua mudam a lista.
  useRecarregarAoVoltar(recarregarTudo);
  useAtualizacaoPeriodica(recarregarRegua, intervaloDaRegua(regua.dados?.dados));

  useEffect(
    () => envioAutomatico.ouvir(() => void recarregarSituacao()),
    [recarregarSituacao],
  );


  const dados = situacao.dados;
  const bairro = dados?.dados;
  const agora = new Date();
  const ruas = bairro?.ruas ?? [];
  const emSilencio = ruas.filter((r) => r.status === null);
  const comChamada = !!bairro && bairro.chamadaIniciadaEm !== null && ruas.length > 0;
  const visitadas = new Set(visitas.dados ?? []);
  const exemplo = avisoDeExemplo();
  const falhouRegua = regua.erro !== null;

  async function chamarRuas() {
    const texto = montarTextoChamarRuas(
      emSilencio.map((r) => r.nome),
      !usaApiDoBairro(),
    );
    if (!(await abrirWhatsApp(texto))) {
      Alert.alert('Não foi possível abrir o WhatsApp', 'Instale o WhatsApp ou avise as ruas por outro meio.');
    }
  }

  const rodape =
    comChamada && emSilencio.length > 0 ? (
      <Rodape>
        <Botao
          titulo={emSilencio.length === 1 ? 'Chamar a rua' : `Chamar as ${emSilencio.length} ruas`}
          onPress={chamarRuas}
        />
      </Rodape>
    ) : undefined;

  const reguaDado = <Dado rotulo="Régua" valor={valorDaRegua(regua.dados?.dados, falhouRegua, agora)} />;
  const textoDaMedida = regua.dados ? notaDaMedida(regua.dados.dados.medidaEm, agora) : '';
  const notaDaRegua = regua.dados ? (
    <>
      {textoDaMedida ? <Nota>{textoDaMedida}</Nota> : null}
      <DadoSalvo resultado={regua.dados} falhouAgora={falhouRegua} />
    </>
  ) : null;

  return (
    <Tela rodape={rodape} onAtualizar={recarregarTudo}>
      <Topo rotulo={bairro?.bairro} />

      {!dados || !bairro ? (
        situacao.erro ? (
          <Estado
            tipo="erro"
            titulo="Não foi possível ver o bairro"
            mensagem={mensagemDoErro(situacao.erro)}
            onTentarDeNovo={recarregarSituacao}
          />
        ) : (
          <Estado tipo="carregando" titulo="Buscando a situação do bairro…" />
        )
      ) : ruas.length === 0 ? (
        <>
          <Estado tipo="vazio" titulo="Nenhuma rua cadastrada" />
          <DadoSalvo resultado={dados} falhouAgora={situacao.erro !== null} />
        </>
      ) : bairro.chamadaIniciadaEm === null ? (
        // Sem chamada ninguém foi perguntado: não existe rua "em silêncio".
        <>
          <Titulo
            titulo="Nenhuma chamada aberta."
            apoio="Quando o coordenador abrir a chamada, as ruas aparecem aqui."
          />
          {exemplo ? <Nota>{exemplo}</Nota> : null}
          <DadoSalvo resultado={dados} falhouAgora={situacao.erro !== null} />
          <Dados>{reguaDado}</Dados>
          {notaDaRegua}
        </>
      ) : (
        <>
          <Titulo
            variante="destaque"
            titulo={`${ruas.length - emSilencio.length} de ${ruas.length}`}
            apoio={`ruas responderam. Chamada aberta há ${textoDuracao(bairro.chamadaIniciadaEm, agora)}.`}
          />
          {exemplo ? <Nota>{exemplo}</Nota> : null}
          <DadoSalvo resultado={dados} falhouAgora={situacao.erro !== null} />

          <ListaDeRuas
            ruas={ordenarRuas(ruas)}
            visitadas={visitadas}
            onAbrir={(id) => router.push({ pathname: '/bairro/[id]', params: { id } })}
          />

          <Dados>
            <Dado rotulo={`Em ${config.janelaMinutos} minutos`} valor={textoNaJanela(ruas, bairro.chamadaIniciadaEm)} />
            {bairro.percentualSemApp !== undefined ? (
              <Dado rotulo="Sem o app" valor={textoSemApp(bairro.percentualSemApp, bairro.semAppMedidoEm)} />
            ) : null}
            {reguaDado}
          </Dados>
          {notaDaRegua}
          {emSilencio.length === 0 ? <Nota>Todas as ruas já responderam.</Nota> : null}
        </>
      )}
    </Tela>
  );
}

function textoNaJanela(ruas: Parameters<typeof resumirBairro>[0], chamadaIniciadaEm: string): string {
  const resumo = resumirBairro(ruas, chamadaIniciadaEm, config.janelaMinutos);
  return `${resumo.conhecidasNaJanela} de ${resumo.total} ruas (${resumo.percentualNaJanela}%)`;
}

function ListaDeRuas({
  ruas,
  visitadas,
  onAbrir,
}: {
  ruas: ReturnType<typeof ordenarRuas>;
  visitadas: ReadonlySet<string>;
  onAbrir: (id: string) => void;
}) {
  return (
    <View className="mt-4">
      {ruas.map((rua, i) => {
        const rotulo = rotuloDaRua(rua.status);
        return (
          <Linha
            key={rua.id}
            titulo={rua.nome}
            valor={visitadas.has(rua.id) ? `${rotulo}, você vai até lá` : rotulo}
            tomValor={rua.status === null ? 'silencio' : 'apoio'}
            forte={rua.status === 'preciso_ajuda'}
            ultima={i === ruas.length - 1}
            onPress={() => onAbrir(rua.id)}
            accessibilityHint="Abre o plano da rua"
          />
        );
      })}
    </View>
  );
}
