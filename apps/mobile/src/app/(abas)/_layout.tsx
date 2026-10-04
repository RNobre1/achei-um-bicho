import { Tabs } from 'expo-router/tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { IconePerto, IconePistas, IconePublicar } from '../../componentes/Icones'
import { cores, fontes } from '../../tema'

export default function Abas() {
  const margens = useSafeAreaInsets()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.tapajos,
        tabBarInactiveTintColor: cores.apagado,
        // a altura padrão da barra corta o rótulo na fonte do protótipo
        tabBarStyle: {
          backgroundColor: cores.chuva,
          borderTopColor: cores.traco,
          height: 58 + margens.bottom,
          paddingBottom: margens.bottom,
        },
        tabBarLabelStyle: { fontFamily: fontes.textoMedio, fontSize: 11, lineHeight: 14 },
        sceneStyle: { backgroundColor: cores.chuva },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Perto', tabBarIcon: ({ color }) => <IconePerto cor={color} /> }}
      />
      <Tabs.Screen
        name="publicar"
        options={{ title: 'Publicar', tabBarIcon: ({ color }) => <IconePublicar cor={color} /> }}
      />
      <Tabs.Screen
        name="pistas"
        options={{ title: 'Pistas', tabBarIcon: ({ color }) => <IconePistas cor={color} /> }}
      />
    </Tabs>
  )
}
