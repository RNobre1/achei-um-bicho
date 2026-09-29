import { Pressable, StyleSheet, Text } from 'react-native'
import { cores, fontes } from '../tema'

interface Props {
  rotulo: string
  marcado: boolean
  aoTocar: () => void
}

export function Chip({ rotulo, marcado, aoTocar }: Props) {
  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityState={{ selected: marcado }}
      style={[estilos.chip, marcado && estilos.marcado]}
    >
      <Text style={[estilos.texto, marcado && estilos.textoMarcado]}>{rotulo}</Text>
    </Pressable>
  )
}

const estilos = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.4,
    borderColor: cores.traco,
    backgroundColor: cores.branco,
  },
  marcado: { backgroundColor: cores.tapajos, borderColor: cores.tapajos },
  texto: { fontFamily: fontes.textoMedio, fontSize: 14, color: cores.texto },
  textoMarcado: { fontFamily: fontes.textoForte, color: cores.branco },
})
