import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { cores, fontes } from '../tema'

/** Seta de voltar do protótipo. Sem histórico (link aberto direto), volta ao mural. */
export function Voltar({ rotulo = 'Voltar' }: { rotulo?: string }) {
  const router = useRouter()
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      accessibilityRole="button"
      style={estilos.botao}
      hitSlop={10}
    >
      <View style={estilos.seta} />
      <Text style={estilos.texto}>{rotulo}</Text>
    </Pressable>
  )
}

const estilos = StyleSheet.create({
  botao: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  seta: {
    width: 9,
    height: 9,
    borderLeftWidth: 1.8,
    borderBottomWidth: 1.8,
    borderColor: cores.apagado,
    transform: [{ rotate: '45deg' }],
    marginLeft: 3,
  },
  texto: { fontFamily: fontes.textoMedio, fontSize: 15, color: cores.apagado },
})
