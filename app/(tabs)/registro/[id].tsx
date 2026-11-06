import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Botao, Dado, Dados, Estado, Nota, Rodape, Secao, Tela, Texto, Titulo, Voltar } from '../../../src/components';
import { usaApiDoBairro } from '../../../src/config';
import { buscarPorId } from '../../../src/db/chamadas';
import { ROTULO_STATUS, textoDoEnvio } from '../../../src/domain/chamada';
import { diaEHora } from '../../../src/domain/formatar';
import { useCarregamento } from '../../../src/hooks/useCarregamento';
import { useEnvioManual } from '../../../src/hooks/useEnvioManual';
import { reenviarPendentes } from '../../../src/services/chamadas';

export default function DetalheDaResposta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detalhe = useCarregamento(() => buscarPorId(String(id)), [id]);
  const { recado, enviarPorSms, enviarPorWhatsApp } = useEnvioManual();
  const [reenviando, setReenviando] = useState(false);
  const [aindaFalta, setAindaFalta] = useState(false);

  async function tentarDeNovo() {
    setReenviando(true);
    try {
      const { faltam } = await reenviarPendentes();
      setAindaFalta(faltam > 0);
    } catch {
      setAindaFalta(true);
    } finally {
      setReenviando(false);
      await detalhe.recarregar();
    }
  }

  const chamada = detalhe.dados;
  const voltar = <Voltar rotulo="Voltar para o registro" />;

  if (chamada === undefined) {
    return (
      <Tela>
        {voltar}
        {detalhe.erro ? (
          <Estado tipo="erro" titulo="Não foi possível abrir a resposta" onTentarDeNovo={detalhe.recarregar} />
        ) : (
          <Estado tipo="carregando" titulo="Abrindo a resposta…" />
        )}
      </Tela>
    );
  }

  if (chamada === null) {
    return (
      <Tela>
        {voltar}
        <Estado tipo="vazio" titulo="Resposta não encontrada" mensagem="Ela pode ter sido apagada do registro." />
      </Tela>
    );
  }

  return (
    <Tela
      rodape={
        <Rodape>
          {!chamada.sincronizada ? (
            <Botao titulo="Tentar enviar de novo" carregando={reenviando} onPress={tentarDeNovo} />
          ) : null}
          <Botao
            variante="texto"
            titulo="Enviar por SMS"
            accessibilityHint="Abre o app de mensagens com o texto pronto"
            onPress={() => enviarPorSms(chamada)}
          />
          <Botao
            variante="texto"
            titulo="Mandar no WhatsApp"
            accessibilityHint="Abre o WhatsApp com o texto pronto"
            onPress={() => enviarPorWhatsApp(chamada)}
          />
        </Rodape>
      }
    >
      {voltar}
      <Titulo titulo={diaEHora(chamada.criadaEm)} apoio={`${chamada.ruaNome}: ${ROTULO_STATUS[chamada.status]}.`} />
      <Dados>
        <Dado rotulo="Envio" valor={textoDoEnvio(chamada.sincronizada, usaApiDoBairro())} />
        {chamada.pessoas !== null ? <Dado rotulo="Pessoas" valor={String(chamada.pessoas)} /> : null}
      </Dados>
      {chamada.observacao ? (
        <Secao rotulo="Observação">
          <Texto>{chamada.observacao}</Texto>
        </Secao>
      ) : null}
      {!chamada.sincronizada && aindaFalta ? (
        <Nota tom="apoio">Não foi possível enviar. Confira a internet e tente de novo.</Nota>
      ) : null}
      {recado ? <Nota tom="apoio">{recado}</Nota> : null}
    </Tela>
  );
}
