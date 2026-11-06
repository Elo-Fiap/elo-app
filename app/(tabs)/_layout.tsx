import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';

import { Icone, type NomeIcone } from '../../src/components';
import { precisaDoPrimeiroUso } from '../../src/db/rua';
import { useEnvioAutomatico } from '../../src/hooks/useEnvioAutomatico';
import { useTheme } from '../../src/theme';

const ABAS: { nome: string; titulo: string; icone: NomeIcone }[] = [
  { nome: '(agora)', titulo: 'Agora', icone: 'agora' },
  { nome: 'bairro', titulo: 'Bairro', icone: 'bairro' },
  { nome: 'plano', titulo: 'Plano', icone: 'plano' },
  { nome: 'registro', titulo: 'Registro', icone: 'registro' },
];

type Abertura = 'lendo' | 'primeiro_uso' | 'pronto';

export default function LayoutAbas() {
  const { cores, fontes, tamanhosFonte } = useTheme();
  const [abertura, setAbertura] = useState<Abertura>('lendo');
  useEnvioAutomatico();

  useEffect(() => {
    let ativo = true;
    precisaDoPrimeiroUso()
      .then((precisa) => {
        if (ativo) setAbertura(precisa ? 'primeiro_uso' : 'pronto');
      })
      // Sem conseguir ler, abre o app: a pessoa ainda escolhe a rua pelo topo.
      .catch(() => {
        if (ativo) setAbertura('pronto');
      });
    return () => {
      ativo = false;
    };
  }, []);

  if (abertura === 'lendo') return null;
  if (abertura === 'primeiro_uso') return <Redirect href="/inicio" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.tinta,
        tabBarInactiveTintColor: cores.rotulo,
        tabBarLabelStyle: { fontFamily: fontes.corpoMedio, fontSize: tamanhosFonte.rotulo, lineHeight: 16 },
        tabBarStyle: { backgroundColor: cores.fundo, borderTopColor: cores.linha, borderTopWidth: 1 },
        sceneStyle: { backgroundColor: cores.fundo },
      }}
    >
      {ABAS.map((aba) => (
        <Tabs.Screen
          key={aba.nome}
          name={aba.nome}
          options={{
            title: aba.titulo,
            tabBarAccessibilityLabel: aba.titulo,
            tabBarIcon: ({ color }) => <Icone nome={aba.icone} cor={String(color)} />,
          }}
        />
      ))}
    </Tabs>
  );
}
