import { StyleSheet, Text, View } from 'react-native'
import { cores, fontes } from '../tema'

export function Aviso({ titulo, texto }: { titulo?: string; texto: string }) {
  return (
    <View style={estilos.caixa}>
      {titulo ? <Text style={estilos.titulo}>{titulo}</Text> : null}
      <Text style={estilos.texto}>{texto}</Text>
    </View>
  )
}

const estilos = StyleSheet.create({
  caixa: {
    borderLeftWidth: 3,
    borderLeftColor: cores.alter,
    backgroundColor: '#E6EAE5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  titulo: { fontFamily: fontes.textoForte, fontSize: 13, color: cores.texto },
  texto: { fontFamily: fontes.texto, fontSize: 13, lineHeight: 20, color: '#33474D' },
})
