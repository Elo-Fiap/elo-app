import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, View } from 'react-native';

import { Botao, Campo, Estado, Folha, Icone, Linha, Nota } from '../src/components';
import { config } from '../src/config';
import { restaurarAreaPadrao, salvarArea } from '../src/db/area';
import { normalizarBusca } from '../src/domain/formatar';
import { semToqueDuplo } from '../src/domain/toque';
import { useAreaAtual } from '../src/hooks/useAreaAtual';
import { useCarregamento } from '../src/hooks/useCarregamento';
import { useRuaEscolhida } from '../src/hooks/useRuaEscolhida';
import { buscarAreaPorCep, normalizarCep } from '../src/services/cep';
import { consultarDistritos, consultarSituacao } from '../src/services/consultas';
import { ErroServico, mensagemDoErro } from '../src/services/http';
import { useTheme } from '../src/theme';
import type { Area, Distrito } from '../src/types';

const CIDADE_DOS_DISTRITOS = 'São Paulo';

type Busca = { tipo: 'parado' } | { tipo: 'carregando' } | { tipo: 'erro'; mensagem: string };

function areaDoDistrito(distrito: Distrito): Area {
  return {
    nome: `${distrito.nome}, ${CIDADE_DOS_DISTRITOS}`,
    codigoIbge: config.areaPadrao.codigoIbge,
    latitude: config.areaPadrao.latitude,
    longitude: config.areaPadrao.longitude,
  };
}

// Só dígitos e hífen: é CEP. Com letras, é o nome de um distrito.
const SO_DIGITOS = /^[\d-]+$/;

export default function TelaArea() {
  const router = useRouter();
  const { cores } = useTheme();
  const areaAtual = useAreaAtual();
  const { ruaId, escolherRua } = useRuaEscolhida();
  const situacao = useCarregamento(consultarSituacao, []);
  const distritos = useCarregamento(() => consultarDistritos(config.areaPadrao.codigoIbge), []);

  const [verRuas, setVerRuas] = useState(false);
  const [texto, setTexto] = useState('');
  const [busca, setBusca] = useState<Busca>({ tipo: 'parado' });
  const [achada, setAchada] = useState<Area | null>(null);
  const [erroAoSalvar, setErroAoSalvar] = useState(false);
  const [erroAoSalvarRua, setErroAoSalvarRua] = useState(false);
  const trava = useRef(false);
  // Resposta que chega depois de outra busca, ou depois de mudar o texto, é ignorada.
  const numeroDaBusca = useRef(0);
  useEffect(
    () => () => {
      numeroDaBusca.current++;
    },
    [],
  );

  function fechar() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function usar(area: Area) {
    setErroAoSalvar(false);
    try {
      await salvarArea(area);
      fechar();
    } catch {
      setErroAoSalvar(true);
    }
  }

  async function usarRua(id: string) {
    setErroAoSalvarRua(false);
    try {
      await escolherRua(id);
      fechar();
    } catch {
      setErroAoSalvarRua(true);
    }
  }

  async function usarAreaDeExemplo() {
    setErroAoSalvar(false);
    try {
      await restaurarAreaPadrao();
      fechar();
    } catch {
      setErroAoSalvar(true);
    }
  }

  function mudarTexto(novo: string) {
    numeroDaBusca.current++;
    setTexto(novo);
    setAchada(null);
    setBusca({ tipo: 'parado' });
  }

  async function buscarCep(valor: string = texto) {
    // O resultado aparece abaixo do campo: com o teclado aberto, ele ficaria escondido.
    Keyboard.dismiss();
    const minha = ++numeroDaBusca.current;
    setAchada(null);
    if (!normalizarCep(valor)) {
      setBusca({ tipo: 'erro', mensagem: 'Digite os 8 números do CEP.' });
      return;
    }
    setBusca({ tipo: 'carregando' });
    try {
      const area = await buscarAreaPorCep(valor);
      if (minha !== numeroDaBusca.current) return;
      setAchada(area);
      setBusca({ tipo: 'parado' });
    } catch (erro) {
      if (minha !== numeroDaBusca.current) return;
      const naoAchou = erro instanceof ErroServico && erro.tipo === 'nao_encontrado';
      setBusca({
        tipo: 'erro',
        mensagem: naoAchou
          ? 'Não encontramos esse CEP. Confira os números ou busque pelo distrito.'
          : mensagemDoErro(erro),
      });
    }
  }

  const ehCep = SO_DIGITOS.test(texto.trim());
  const ruas = situacao.dados?.dados.ruas;
  const nomeDaRua = ruas?.find((r) => r.id === ruaId)?.nome;
  const valorDaRua = nomeDaRua ?? (ruaId && situacao.carregando ? 'Buscando…' : 'Escolher');

  const termo = normalizarBusca(texto);
  const listaDeDistritos = (distritos.dados?.dados ?? []).filter((d) => {
    if (termo === '') return areaAtual?.nome !== areaDoDistrito(d).nome;
    return normalizarBusca(d.nome).includes(termo);
  });
  const mostraAtual = termo === '' && areaAtual !== null;

  return (
    <Folha titulo="Trocar área" apoio="Sem CEP? Busque pelo distrito." rolagem>
      <View>
        <Linha
          titulo="Sua rua"
          valor={valorDaRua}
          ultima={!verRuas}
          onPress={() => setVerRuas((v) => !v)}
          accessibilityHint={verRuas ? 'Fecha a lista de ruas' : 'Mostra as ruas para escolher'}
        />
        {verRuas ? (
          ruas?.length === 0 ? (
            <Estado tipo="vazio" titulo="Nenhuma rua cadastrada" />
          ) : ruas ? (
            ruas.map((rua, indice) => {
              const atual = rua.id === ruaId;
              return (
                <Linha
                  key={rua.id}
                  titulo={rua.nome}
                  accessibilityRole="radio"
                  selecionada={atual}
                  ultima={indice === ruas.length - 1}
                  direita={atual ? <Icone nome="marcado" cor={cores.tinta} /> : <View className="h-6 w-6" />}
                  onPress={() => void semToqueDuplo(trava, () => usarRua(rua.id))}
                />
              );
            })
          ) : situacao.erro ? (
            <Estado
              tipo="erro"
              titulo="Não foi possível listar as ruas"
              mensagem={mensagemDoErro(situacao.erro)}
              onTentarDeNovo={situacao.recarregar}
            />
          ) : (
            <Estado tipo="carregando" titulo="Buscando as ruas…" />
          )
        ) : null}
        {erroAoSalvarRua ? <Estado tipo="erro" titulo="Não foi possível guardar a rua" mensagem="Tente de novo." /> : null}
      </View>

      <Campo
        rotulo="CEP ou distrito"
        placeholder="CEP ou distrito"
        busca
        naFolha
        autoCorrect={false}
        returnKeyType="search"
        value={texto}
        onChangeText={mudarTexto}
        onSubmitEditing={({ nativeEvent }) => {
          if (SO_DIGITOS.test(nativeEvent.text.trim())) void buscarCep(nativeEvent.text);
        }}
        erro={busca.tipo === 'erro' ? busca.mensagem : null}
      />

      {texto.trim() !== '' && ehCep ? (
        <>
          <Botao variante="texto" titulo="Buscar CEP" carregando={busca.tipo === 'carregando'} onPress={() => buscarCep()} />
          {achada ? (
            <View>
              <Linha titulo={achada.nome} ultima onPress={() => void semToqueDuplo(trava, () => usar(achada))} />
              {achada.latitude === undefined ? (
                <Nota>Esta área não tem localização: não vai haver previsão de chuva, só os avisos do INMET.</Nota>
              ) : null}
            </View>
          ) : null}
        </>
      ) : distritos.dados ? (
        <View>
          <Nota>A chuva é aproximada: usamos o centro de São Paulo, não o seu distrito.</Nota>
          <View className="mt-3">
            {mostraAtual ? (
              <Linha
                titulo={areaAtual.nome}
                valor="Atual"
                ultima={listaDeDistritos.length === 0}
                direita={<Icone nome="marcado" cor={cores.tinta} />}
              />
            ) : null}
            {listaDeDistritos.map((distrito, indice) => (
              <Linha
                key={distrito.id}
                titulo={distrito.nome}
                ultima={indice === listaDeDistritos.length - 1}
                onPress={() => void semToqueDuplo(trava, () => usar(areaDoDistrito(distrito)))}
              />
            ))}
          </View>
          {!mostraAtual && listaDeDistritos.length === 0 ? (
            <Estado tipo="vazio" titulo="Nenhum distrito com esse nome" mensagem="Confira as letras digitadas." />
          ) : null}
        </View>
      ) : distritos.erro ? (
        <Estado
          tipo="erro"
          titulo="Não foi possível listar os distritos"
          mensagem={mensagemDoErro(distritos.erro)}
          onTentarDeNovo={distritos.recarregar}
        />
      ) : (
        <Estado tipo="carregando" titulo="Buscando os distritos…" />
      )}

      {erroAoSalvar ? <Estado tipo="erro" titulo="Não foi possível guardar a área" mensagem="Tente de novo." /> : null}

      <Botao
        variante="texto"
        titulo="Usar a área de exemplo"
        accessibilityHint={`Volta para ${config.areaPadrao.nome}`}
        onPress={usarAreaDeExemplo}
      />
    </Folha>
  );
}
