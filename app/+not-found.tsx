import { useRouter } from 'expo-router';

import { Botao, Tela, Titulo, Voltar } from '../src/components';

export default function NaoEncontrada() {
  const router = useRouter();
  return (
    <Tela>
      <Voltar />
      <Titulo titulo="Esta tela não existe" apoio="O endereço que você abriu não foi encontrado no app." />
      <Botao variante="texto" titulo="Voltar para o início" onPress={() => router.replace('/')} />
    </Tela>
  );
}
