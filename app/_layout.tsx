import '../global.css';

import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk/500Medium';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { vars } from 'nativewind';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Botao, Estado, LinhasEmergencia, Tela, Titulo } from '../src/components';
import { apagarAntigas } from '../src/db/chamadas';
import { getDb } from '../src/db/database';
import { useTheme, variaveisCss } from '../src/theme';

// A abertura fica na tela até as fontes e o banco estarem prontos.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

type Banco = 'abrindo' | 'pronto' | 'falhou';

/** Aplica as cores do tema. Sem isso, as classes do Tailwind ficam sem valor. */
function RaizDoTema({ children }: { children: ReactNode }) {
  const { cores, esquema } = useTheme();
  return (
    <SafeAreaProvider>
      <View style={vars(variaveisCss(cores))} className="flex-1 bg-fundo">
        <StatusBar style={esquema === 'escuro' ? 'light' : 'dark'} />
        {children}
      </View>
    </SafeAreaProvider>
  );
}

/** Qualquer erro inesperado de tela cai aqui, em vez de fechar o app. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);
  return (
    <RaizDoTema>
      <Tela>
        <Titulo titulo="Algo deu errado" apoio="Suas respostas guardadas no celular continuam salvas." />
        <Botao variante="texto" titulo="Tentar de novo" onPress={retry} />
        <LinhasEmergencia />
      </Tela>
    </RaizDoTema>
  );
}

export default function LayoutRaiz() {
  const { cores } = useTheme();
  const [banco, setBanco] = useState<Banco>('abrindo');
  const [fontesProntas, erroNasFontes] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  // Sem as fontes o app ainda funciona, com a do sistema: uma falha aqui não pode impedir a chamada.
  const fontesResolvidas = fontesProntas || erroNasFontes !== null;

  const iniciarBanco = useCallback(async () => {
    setBanco('abrindo');
    try {
      await getDb();
      // Se a limpeza falhar, tenta de novo na próxima abertura: não pode travar o app.
      await apagarAntigas().catch(() => undefined);
      setBanco('pronto');
    } catch {
      setBanco('falhou');
    }
  }, []);

  useEffect(() => {
    void iniciarBanco();
  }, [iniciarBanco]);

  useEffect(() => {
    if (fontesResolvidas && banco !== 'abrindo') SplashScreen.hideAsync().catch(() => undefined);
  }, [fontesResolvidas, banco]);

  if (!fontesResolvidas) return null;

  const folha = {
    presentation: 'formSheet',
    headerShown: false,
    sheetGrabberVisible: true,
    sheetCornerRadius: 24,
    contentStyle: { backgroundColor: cores.folha },
  } as const;

  return (
    <RaizDoTema>
      {banco === 'pronto' ? (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="inicio" options={{ gestureEnabled: false }} />
          <Stack.Screen name="area" options={{ ...folha, sheetAllowedDetents: [0.9] }} />
          <Stack.Screen name="ajuda" options={{ ...folha, sheetAllowedDetents: 'fitToContents' }} />
          <Stack.Screen name="emergencia" options={{ ...folha, sheetAllowedDetents: 'fitToContents' }} />
        </Stack>
      ) : (
        <Tela>
          {banco === 'abrindo' ? (
            <Estado tipo="carregando" titulo="Abrindo o app…" />
          ) : (
            <>
              <Estado
                tipo="erro"
                titulo="Não foi possível abrir os dados do celular"
                mensagem="Feche o app e abra de novo. Se continuar, libere espaço no celular."
                onTentarDeNovo={iniciarBanco}
              />
              <LinhasEmergencia />
            </>
          )}
        </Tela>
      )}
    </RaizDoTema>
  );
}
