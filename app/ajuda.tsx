import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Botao, Campo, Estado, Folha, Linha, LinhasEmergencia, Texto } from '../src/components';
import { lerRuaId } from '../src/db/rua';
import { useCarregamento } from '../src/hooks/useCarregamento';
import { guardarChamada, tentarEnviar } from '../src/services/chamadas';
import { consultarSituacao } from '../src/services/consultas';
import { envioAutomatico } from '../src/services/envioAutomatico';
import { mensagemDoErro } from '../src/services/http';
import type { Chamada } from '../src/types';

const MAXIMO_PESSOAS = 999;
const MAXIMO_OBSERVACAO = 200;

interface PropsPassinho {
  rotulo: string;
  sinal: string;
  /** O VoiceOver lê o novo valor no próprio botão: o `accessibilityLiveRegion` só vale no Android. */
  valor: string;
  desabilitado: boolean;
  onPress: () => void;
}

function Passinho({ rotulo, sinal, valor, desabilitado, onPress }: PropsPassinho) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desabilitado}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: desabilitado }}
      accessibilityValue={{ text: valor }}
      className={`h-12 w-12 items-center justify-center active:opacity-60 ${desabilitado ? 'opacity-40' : ''}`}
    >
      <Texto variante="resposta">{sinal}</Texto>
    </Pressable>
  );
}

export default function TelaAjuda() {
  const router = useRouter();
  const ruaSalva = useCarregamento(lerRuaId, []);
  const situacao = useCarregamento(consultarSituacao, []);

  const [pessoas, setPessoas] = useState(0);
  const [comObservacao, setComObservacao] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [comEmergencia, setComEmergencia] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [falhaAoGuardar, setFalhaAoGuardar] = useState(false);

  if (ruaSalva.dados === undefined || (!situacao.dados && !situacao.erro)) {
    if (ruaSalva.erro) {
      return (
        <Folha titulo="Pedir ajuda" apoio="O coordenador do bairro será avisado.">
          <Estado tipo="vazio" titulo="Escolha a sua rua primeiro." />
        </Folha>
      );
    }
    return (
      <Folha titulo="Pedir ajuda" apoio="O coordenador do bairro será avisado.">
        <Estado tipo="carregando" titulo="Abrindo…" />
      </Folha>
    );
  }

  if (!situacao.dados) {
    return (
      <Folha titulo="Pedir ajuda" apoio="O coordenador do bairro será avisado.">
        <Estado
          tipo="erro"
          titulo="Não foi possível ver a sua rua"
          mensagem={situacao.erro ? mensagemDoErro(situacao.erro) : undefined}
          onTentarDeNovo={situacao.recarregar}
        />
        <LinhasEmergencia />
      </Folha>
    );
  }

  const rua = situacao.dados.dados.ruas.find((r) => r.id === ruaSalva.dados) ?? null;
  if (!rua) {
    return (
      <Folha titulo="Pedir ajuda" apoio="O coordenador do bairro será avisado.">
        <Estado tipo="vazio" titulo="Escolha a sua rua primeiro." />
      </Folha>
    );
  }

  const valorDePessoas = pessoas === 0 ? 'Não sei' : String(pessoas);

  async function pedirAjuda() {
    if (!rua) return;
    setFalhaAoGuardar(false);
    setSalvando(true);
    let chamada: Chamada;
    try {
      chamada = await guardarChamada({
        ruaId: rua.id,
        ruaNome: rua.nome,
        status: 'preciso_ajuda',
        pessoas: pessoas > 0 ? pessoas : null,
        observacao,
      });
    } catch {
      setFalhaAoGuardar(true);
      setSalvando(false);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    router.back();
    // Sem esperar a tela: a folha fecha na hora e a tela Agora relê as respostas quando o envio termina.
    void tentarEnviar(chamada).finally(() => envioAutomatico.avisar());
  }

  return (
    <Folha titulo={`Pedir ajuda para ${rua.nome}?`} apoio="O coordenador do bairro será avisado.">
      <View>
        {/* Não usa `Linha`: ela vira um grupo acessível e esconderia os dois botões do leitor de tela. */}
        <View className="min-h-14 flex-row items-center gap-2 border-b border-linha">
          <Texto variante="medio" className="flex-1">
            Quantas pessoas
          </Texto>
          <Passinho
            rotulo="Diminuir"
            sinal="−"
            valor={valorDePessoas}
            desabilitado={pessoas <= 0}
            onPress={() => setPessoas((n) => Math.max(0, n - 1))}
          />
          <Texto tom="apoio" accessibilityLiveRegion="polite" className="min-w-[56px] text-center">
            {valorDePessoas}
          </Texto>
          <Passinho
            rotulo="Aumentar"
            sinal="+"
            valor={valorDePessoas}
            desabilitado={pessoas >= MAXIMO_PESSOAS}
            onPress={() => setPessoas((n) => Math.min(MAXIMO_PESSOAS, n + 1))}
          />
        </View>
        <Linha titulo="Observação" valor="Opcional" onPress={() => setComObservacao(true)} />
        {comObservacao ? (
          <View className="pb-3">
            <Campo
              naFolha
              multiline
              autoFocus
              rotulo="Observação"
              maxLength={MAXIMO_OBSERVACAO}
              value={observacao}
              onChangeText={setObservacao}
              ajuda="Não escreva nome, CPF nem dado de saúde. Diga só o que ajuda a chegar até a rua."
            />
          </View>
        ) : null}
        <Linha titulo="Risco de vida?" valor="Emergência" ultima onPress={() => setComEmergencia(true)} />
        {comEmergencia ? <LinhasEmergencia /> : null}
      </View>
      {falhaAoGuardar ? (
        <Estado
          tipo="erro"
          titulo="Não foi possível guardar no celular"
          mensagem="Tente de novo. Se continuar, libere espaço no celular."
        />
      ) : null}
      <Botao
        titulo="Pedir ajuda"
        carregando={salvando}
        accessibilityHint="Guarda no celular e avisa o coordenador do bairro"
        onPress={pedirAjuda}
      />
    </Folha>
  );
}
