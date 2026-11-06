import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { Botao, Estado, Linha, Nota, Secao, Tela, Titulo, Topo } from '../../../src/components';
import { config } from '../../../src/config';
import { apagarTodas, listar } from '../../../src/db/chamadas';
import { ROTULO_STATUS } from '../../../src/domain/chamada';
import { diaEHora } from '../../../src/domain/formatar';
import { agruparPorMes } from '../../../src/domain/registro';
import { useCarregamento } from '../../../src/hooks/useCarregamento';
import { useRecarregarAoVoltar } from '../../../src/hooks/useRecarregarAoVoltar';
import { reenviarPendentes } from '../../../src/services/chamadas';
import { envioAutomatico } from '../../../src/services/envioAutomatico';

export default function TelaRegistro() {
  const router = useRouter();
  const registro = useCarregamento(() => listar(), []);
  const [reenviando, setReenviando] = useState(false);
  const [recado, setRecado] = useState<string | null>(null);

  const { recarregar } = registro;
  useRecarregarAoVoltar(recarregar);
  useEffect(() => envioAutomatico.ouvir(() => void recarregar()), [recarregar]);

  const chamadas = registro.dados ?? [];
  const pendentes = chamadas.filter((c) => !c.sincronizada).length;
  const grupos = agruparPorMes(chamadas);

  async function tentarDeNovo() {
    setReenviando(true);
    try {
      const { faltam } = await reenviarPendentes();
      setRecado(
        faltam === 0
          ? 'Tudo enviado ao bairro.'
          : `${faltam === 1 ? 'Ainda falta 1' : `Ainda faltam ${faltam}`}. Confira a internet e tente de novo.`,
      );
    } catch {
      setRecado('Não foi possível tentar agora. Tente de novo em alguns instantes.');
    } finally {
      setReenviando(false);
      await recarregar();
    }
  }

  function confirmarApagar() {
    Alert.alert(
      'Apagar registro?',
      'Todas as chamadas guardadas neste celular serão apagadas. Isso não pode ser desfeito.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => {
            apagarTodas()
              .then(() => {
                setRecado(null);
                return recarregar();
              })
              .catch(() => Alert.alert('Não foi possível apagar', 'Tente de novo.'));
          },
        },
      ],
    );
  }

  return (
    <Tela onAtualizar={recarregar}>
      <Topo semEmergencia />
      <Titulo titulo="Registro" />

      {registro.dados === undefined ? (
        registro.erro ? (
          <Estado
            tipo="erro"
            titulo="Não foi possível abrir o registro"
            mensagem="Tente de novo."
            onTentarDeNovo={recarregar}
          />
        ) : (
          <Estado tipo="carregando" titulo="Abrindo o registro…" />
        )
      ) : chamadas.length === 0 ? (
        <Estado
          tipo="vazio"
          titulo="Nenhuma resposta ainda"
          mensagem="Quando você responder à chamada, ela aparece aqui."
        />
      ) : (
        <>
          {pendentes > 0 ? (
            <View className="mt-8 items-start gap-1">
              <Nota tom="apoio">
                {pendentes === 1
                  ? '1 resposta ainda não chegou ao bairro.'
                  : `${pendentes} respostas ainda não chegaram ao bairro.`}
              </Nota>
              <Botao variante="texto" titulo="Tentar enviar de novo" carregando={reenviando} onPress={tentarDeNovo} />
            </View>
          ) : null}
          {recado ? <Nota tom="apoio">{recado}</Nota> : null}

          {grupos.map((grupo) => (
            <Secao key={grupo.chave} rotulo={grupo.mes}>
              <View className="-mt-2">
                {grupo.chamadas.map((c, indice) => (
                  <Linha
                    key={c.id}
                    titulo={diaEHora(c.criadaEm)}
                    valor={c.sincronizada ? ROTULO_STATUS[c.status] : 'Falta enviar'}
                    ultima={indice === grupo.chamadas.length - 1}
                    accessibilityHint={`Rua: ${c.ruaNome}`}
                    onPress={() => router.push(`/registro/${c.id}`)}
                  />
                ))}
              </View>
            </Secao>
          ))}

          <View className="mt-5 items-start">
            <Nota>{`Fica só neste celular e se apaga em ${config.diasDeHistorico} dias.`}</Nota>
            <Botao variante="texto" titulo="Apagar registro" accessibilityHint="Pede confirmação antes de apagar" onPress={confirmarApagar} />
          </View>
        </>
      )}
    </Tela>
  );
}
