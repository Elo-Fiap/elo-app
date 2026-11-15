import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import {
  Botao,
  Dado,
  Dados,
  DadoSalvo,
  Estado,
  Nota,
  Rodape,
  Secao,
  Tela,
  Texto,
  Titulo,
  Voltar,
} from '../../../src/components';
import { avisoDeExemplo, usaApiDoBairro } from '../../../src/config';
import { listarVisitas, marcarVisita } from '../../../src/db/visitas';
import { montarTextoChamarRuas, montarTextoWhatsApp } from '../../../src/domain/chamada';
import { rotuloDaRua } from '../../../src/domain/estados';
import { textoDuracao, textoHa } from '../../../src/domain/formatar';
import { useCarregamento } from '../../../src/hooks/useCarregamento';
import { useRecarregarAoVoltar } from '../../../src/hooks/useRecarregarAoVoltar';
import { consultarPlano, consultarSituacaoComLocais } from '../../../src/services/consultas';
import { ErroServico, mensagemDoErro } from '../../../src/services/http';
import { abrirNoMapa, temPosicao } from '../../../src/services/mapas';
import { abrirWhatsApp } from '../../../src/services/mensagens';
import type { Rua } from '../../../src/types';

function apoioDaRua(rua: Rua, chamadaIniciadaEm: string | null, agora: Date) {
  if (chamadaIniciadaEm === null) return { texto: 'Nenhuma chamada aberta.', silencio: false };
  if (rua.status === null) {
    return { texto: `Em silêncio há ${textoDuracao(chamadaIniciadaEm, agora)}.`, silencio: true };
  }
  const quando = textoHa(rua.respondidaEm, agora);
  return { texto: `${rotuloDaRua(rua.status)}${quando ? ` ${quando}` : ''}.`, silencio: false };
}

export default function TelaRua() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const situacao = useCarregamento(consultarSituacaoComLocais, []);
  const plano = useCarregamento(() => consultarPlano(id), [id]);

  const chamadaIniciadaEm = situacao.dados?.dados.chamadaIniciadaEm ?? null;
  const visitas = useCarregamento(
    async () => (chamadaIniciadaEm ? await listarVisitas(chamadaIniciadaEm).catch((): string[] => []) : []),
    [chamadaIniciadaEm],
  );

  const { recarregar: recarregarSituacao } = situacao;
  const { recarregar: recarregarPlano } = plano;
  const { recarregar: recarregarVisitas } = visitas;
  const recarregarTudo = useCallback(
    async () => void (await Promise.all([recarregarSituacao(), recarregarPlano(), recarregarVisitas()])),
    [recarregarSituacao, recarregarPlano, recarregarVisitas],
  );
  useRecarregarAoVoltar(recarregarTudo);

  const topo = <Voltar rotulo="Voltar para o bairro" />;

  if (!situacao.dados) {
    return (
      <Tela>
        {topo}
        {situacao.erro ? (
          <Estado
            tipo="erro"
            titulo="Não foi possível ver a rua"
            mensagem={mensagemDoErro(situacao.erro)}
            onTentarDeNovo={recarregarSituacao}
          />
        ) : (
          <Estado tipo="carregando" titulo="Buscando a situação do bairro…" />
        )}
      </Tela>
    );
  }

  const rua = situacao.dados.dados.ruas.find((r) => r.id === id);
  if (!rua) {
    return (
      <Tela>
        {topo}
        <Estado tipo="vazio" titulo="Rua não encontrada" />
      </Tela>
    );
  }

  const apoio = apoioDaRua(rua, chamadaIniciadaEm, new Date());
  const precisaDeVisita = chamadaIniciadaEm !== null && (rua.status === null || rua.status === 'preciso_ajuda');
  const jaVai = (visitas.dados ?? []).includes(rua.id);
  const dadosDoPlano = plano.dados?.dados;
  const exemplo = avisoDeExemplo();

  async function chamarNoWhatsApp() {
    const exemplo = !usaApiDoBairro();
    // Rua que pediu ajuda já respondeu: "ainda não respondeu" seria falso num grupo de verdade.
    const texto =
      rua!.status === 'preciso_ajuda'
        ? montarTextoWhatsApp(
            { ruaNome: rua!.nome, status: rua!.status, pessoas: null, observacao: null, criadaEm: rua!.respondidaEm ?? '' },
            exemplo,
          )
        : montarTextoChamarRuas([rua!.nome], exemplo);
    if (!(await abrirWhatsApp(texto))) {
      Alert.alert('Não foi possível abrir o WhatsApp', 'Instale o WhatsApp ou avise a rua por outro meio.');
    }
  }

  async function verNoMapa() {
    if (!(await abrirNoMapa(rua!))) {
      Alert.alert('Não foi possível abrir o mapa', 'Instale um app de mapas ou procure a rua pelo nome.');
    }
  }

  async function vouAteLa() {
    try {
      await marcarVisita(rua!.id, chamadaIniciadaEm!);
    } catch {
      Alert.alert('Não foi possível marcar', 'Tente de novo.');
      return;
    }
    await recarregarVisitas();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }

  const rodape = precisaDeVisita ? (
    <Rodape>
      <Botao variante="texto" titulo="Chamar no WhatsApp" onPress={chamarNoWhatsApp} />
      {jaVai ? (
        <Nota>Você marcou que vai até lá. Por enquanto, isso fica só neste celular.</Nota>
      ) : (
        <Botao titulo="Vou até lá" onPress={vouAteLa} />
      )}
    </Rodape>
  ) : undefined;

  return (
    <Tela rodape={rodape} onAtualizar={recarregarTudo}>
      {topo}
      <Titulo titulo={rua.nome} apoio={apoio.texto} tomApoio={apoio.silencio ? 'silencio' : 'apoio'} />

      {dadosDoPlano ? (
        <>
          <Dados>
            <Dado rotulo="Encontro" valor={dadosDoPlano.pontoEncontro} />
            {dadosDoPlano.abrigo && dadosDoPlano.abrigo !== dadosDoPlano.pontoEncontro ? (
              <Dado rotulo="Abrigo" valor={dadosDoPlano.abrigo} />
            ) : null}
          </Dados>
          <Secao rotulo="Rota de saída">
            <Texto>{dadosDoPlano.rotaSaida}</Texto>
          </Secao>
          <DadoSalvo resultado={plano.dados!} falhouAgora={plano.erro !== null} />
        </>
      ) : plano.erro instanceof ErroServico && plano.erro.tipo === 'nao_encontrado' ? (
        <Nota>Esta rua ainda não tem plano.</Nota>
      ) : plano.erro ? (
        <Estado
          tipo="erro"
          titulo="Não foi possível abrir o plano"
          mensagem={mensagemDoErro(plano.erro)}
          onTentarDeNovo={recarregarPlano}
        />
      ) : (
        <Estado tipo="carregando" titulo="Abrindo o plano…" />
      )}

      {temPosicao(rua) ? (
        <Botao
          variante="texto"
          titulo="Ver no mapa"
          onPress={verNoMapa}
          accessibilityLabel={`Ver ${rua.nome} no mapa`}
          accessibilityHint="Abre o app de mapas"
        />
      ) : null}

      <DadoSalvo resultado={situacao.dados} falhouAgora={situacao.erro !== null} />
      {exemplo ? <Nota>{exemplo}</Nota> : null}
    </Tela>
  );
}
