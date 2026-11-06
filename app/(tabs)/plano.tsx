import { useRouter } from 'expo-router';
import { Alert, View } from 'react-native';

import { Botao, DadoSalvo, Estado, Linha, Nota, Rodape, Secao, Tela, Texto, Titulo, Topo } from '../../src/components';
import { avisoDeExemplo } from '../../src/config';
import { formatarMetros } from '../../src/domain/formatar';
import { useCarregamento } from '../../src/hooks/useCarregamento';
import { useRuaEscolhida } from '../../src/hooks/useRuaEscolhida';
import { consultarPlano, consultarRegua, consultarSituacao } from '../../src/services/consultas';
import { ErroServico, mensagemDoErro } from '../../src/services/http';
import { ligar } from '../../src/services/mensagens';
import type { ResultadoComCache } from '../../src/services/comCache';
import type { PlanoRua } from '../../src/types';

/** 199 e 193 já estão na folha de emergência; aqui ficam só os outros contatos da rua. */
const TELEFONES_DE_EMERGENCIA = ['199', '193'];

async function ligarComAviso(numero: string): Promise<void> {
  if (!(await ligar(numero))) {
    Alert.alert('Não foi possível ligar', `Use outro telefone e disque ${numero}.`);
  }
}

export default function TelaPlano() {
  const router = useRouter();
  const { ruaId, pronta } = useRuaEscolhida();
  const situacao = useCarregamento(() => consultarSituacao(), []);
  const plano = useCarregamento(async () => (ruaId ? consultarPlano(ruaId) : null), [ruaId]);
  const regua = useCarregamento(() => consultarRegua(), []);

  const rua = situacao.dados?.dados.ruas.find((r) => r.id === ruaId);
  const dadosDoPlano = plano.dados ?? null;
  const rotulo = rua?.nome ?? dadosDoPlano?.dados.ruaNome;

  function atualizar() {
    return Promise.all([situacao.recarregar(), plano.recarregar(), regua.recarregar()]);
  }

  const topo = <Topo rotulo={rotulo} onTrocar={() => router.push('/area')} />;

  if (!pronta) {
    return (
      <Tela>
        {topo}
        <Titulo titulo="Plano da rua" />
        <Estado tipo="carregando" titulo="Abrindo o plano…" />
      </Tela>
    );
  }

  if (!ruaId) {
    return (
      <Tela
        rodape={
          <Rodape>
            <Botao titulo="Escolher a rua" onPress={() => router.push('/area')} />
          </Rodape>
        }
      >
        {topo}
        <Titulo
          titulo="Plano da rua"
          apoio="Escolha a sua rua para ver o plano. Ele fica guardado no celular e abre sem internet."
        />
      </Tela>
    );
  }

  const semPlano = plano.erro instanceof ErroServico && plano.erro.tipo === 'nao_encontrado';

  return (
    <Tela onAtualizar={atualizar}>
      {topo}
      <Titulo titulo="Plano da rua" />
      {semPlano ? (
        <Estado
          tipo="vazio"
          titulo="Esta rua ainda não tem plano"
          mensagem="Peça ao coordenador do bairro para cadastrar o plano."
        />
      ) : dadosDoPlano === null ? (
        plano.erro ? (
          <Estado
            tipo="erro"
            titulo="Não foi possível abrir o plano"
            mensagem={mensagemDoErro(plano.erro)}
            onTentarDeNovo={plano.recarregar}
          />
        ) : (
          <Estado tipo="carregando" titulo="Abrindo o plano…" />
        )
      ) : (
        <ConteudoDoPlano
          resultado={dadosDoPlano}
          limiteMetros={regua.dados?.dados.limiteMetros ?? null}
          falhouAgora={plano.erro !== null}
        />
      )}
    </Tela>
  );
}

function ConteudoDoPlano({
  resultado,
  limiteMetros,
  falhouAgora,
}: {
  resultado: ResultadoComCache<PlanoRua>;
  limiteMetros: number | null;
  falhouAgora: boolean;
}) {
  const plano = resultado.dados;
  const outrosContatos = plano.contatos.filter((c) => !TELEFONES_DE_EMERGENCIA.includes(c.telefone.replace(/\D/g, '')));
  const mostraAbrigo = plano.abrigo.trim() !== '' && plano.abrigo.trim() !== plano.pontoEncontro.trim();
  const exemplo = avisoDeExemplo();

  return (
    <>
      <Secao rotulo={limiteMetros !== null ? `Quando a régua passar de ${formatarMetros(limiteMetros)}` : 'Rota de saída'}>
        <Texto>{plano.rotaSaida}</Texto>
      </Secao>
      <Secao rotulo="Ponto de encontro">
        <Texto>{plano.pontoEncontro}</Texto>
      </Secao>
      {mostraAbrigo ? (
        <Secao rotulo="Abrigo">
          <Texto>{plano.abrigo}</Texto>
        </Secao>
      ) : null}
      {plano.itensParaLevar.length > 0 ? (
        <Secao rotulo="O que levar">
          <View className="gap-2">
            {plano.itensParaLevar.map((item) => (
              <Texto key={item}>{item}</Texto>
            ))}
          </View>
        </Secao>
      ) : null}
      {outrosContatos.length > 0 ? (
        <Secao rotulo="Outros contatos">
          <View>
            {outrosContatos.map((contato, indice) => (
              <Linha
                key={`${contato.nome}-${contato.telefone}`}
                titulo={contato.nome}
                valor={contato.telefone}
                icone="ligar"
                ultima={indice === outrosContatos.length - 1}
                accessibilityHint="Liga para este telefone"
                onPress={() => void ligarComAviso(contato.telefone)}
              />
            ))}
          </View>
        </Secao>
      ) : null}
      <View className="mt-5">
        <Nota>Disponível sem internet.</Nota>
        <DadoSalvo resultado={resultado} falhouAgora={falhouAgora} />
        {exemplo ? <Nota>{exemplo}</Nota> : null}
      </View>
    </>
  );
}
