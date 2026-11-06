import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { Botao, Campo, DadoSalvo, Estado, Linha, LinhasEmergencia, Nota, Rodape, Tela, Titulo, Topo } from '../src/components';
import { avisoDeExemplo } from '../src/config';
import { marcarPrimeiroUsoFeito, salvarRuaId } from '../src/db/rua';
import { normalizarBusca } from '../src/domain/formatar';
import { semToqueDuplo } from '../src/domain/toque';
import { useCarregamento } from '../src/hooks/useCarregamento';
import { consultarSituacao } from '../src/services/consultas';

export default function TelaInicio() {
  const router = useRouter();
  const situacao = useCarregamento(consultarSituacao, []);
  const [busca, setBusca] = useState('');
  const [erroAoGuardar, setErroAoGuardar] = useState(false);
  const trava = useRef(false);

  async function escolher(id: string) {
    setErroAoGuardar(false);
    try {
      await salvarRuaId(id);
      await marcarPrimeiroUsoFeito();
      router.replace('/');
    } catch {
      setErroAoGuardar(true);
    }
  }

  async function coordenador() {
    try {
      await marcarPrimeiroUsoFeito();
    } catch {
      // Sem gravar, a pergunta volta na próxima abertura; quem coordena segue do mesmo jeito.
    }
    router.replace('/bairro');
  }

  const exemplo = avisoDeExemplo();
  const ruas = situacao.dados?.dados.ruas;
  const termo = normalizarBusca(busca);
  const lista = ruas?.filter((r) => normalizarBusca(r.nome).includes(termo)) ?? [];

  return (
    <Tela
      semAbas
      rodape={
        <Rodape>
          <Botao variante="texto" titulo="Coordeno o bairro inteiro" onPress={coordenador} />
        </Rodape>
      }
    >
      <Topo semEmergencia />
      <Titulo titulo="Qual é a sua rua?" apoio="O Elo só pergunta durante chuva forte." />

      {!situacao.dados ? (
        situacao.erro ? (
          <>
            <Estado
              tipo="erro"
              titulo="Não foi possível listar as ruas"
              mensagem="Sem internet na primeira vez, a lista de ruas não abre. Em perigo, ligue."
              onTentarDeNovo={situacao.recarregar}
            />
            <View className="mt-4">
              <LinhasEmergencia />
            </View>
          </>
        ) : (
          <Estado tipo="carregando" titulo="Buscando as ruas…" />
        )
      ) : !ruas || ruas.length === 0 ? (
        <Estado tipo="vazio" titulo="Nenhuma rua cadastrada" mensagem="Peça ao coordenador do bairro para cadastrar as ruas." />
      ) : (
        <>
          <View className="mt-8">
            <Campo rotulo="Buscar rua" placeholder="Buscar rua" busca value={busca} onChangeText={setBusca} autoCorrect={false} />
          </View>
          {erroAoGuardar ? <Estado tipo="erro" titulo="Não foi possível guardar a rua" mensagem="Tente de novo." /> : null}
          {lista.length === 0 ? (
            <Estado tipo="vazio" titulo="Nenhuma rua com esse nome" />
          ) : (
            <View className="mt-3">
              {lista.map((rua, indice) => (
                <Linha
                  key={rua.id}
                  titulo={rua.nome}
                  ultima={indice === lista.length - 1}
                  onPress={() => void semToqueDuplo(trava, () => escolher(rua.id))}
                />
              ))}
            </View>
          )}
          <DadoSalvo resultado={situacao.dados} />
          {exemplo ? <Nota>{exemplo}</Nota> : null}
        </>
      )}
    </Tela>
  );
}
