import { StyleSheet, Text, View } from 'react-native'
import { cores, fontes } from '../tema'
import { Chip } from './Chip'

interface Props<V extends string> {
  rotulo: string
  opcoes: readonly { valor: V; rotulo: string }[]
  marcado: V | undefined
  aoEscolher: (valor: V) => void
}

export function GrupoDeChips<V extends string>({ rotulo, opcoes, marcado, aoEscolher }: Props<V>) {
  return (
    <View style={estilos.grupo}>
      <Text style={estilos.rotulo}>{rotulo.toUpperCase()}</Text>
      <View style={estilos.chips}>
        {opcoes.map((opcao) => (
          <Chip
            key={opcao.valor}
            rotulo={opcao.rotulo}
            marcado={marcado === opcao.valor}
            aoTocar={() => aoEscolher(opcao.valor)}
          />
        ))}
      </View>
    </View>
  )
}

const estilos = StyleSheet.create({
  grupo: { gap: 7 },
  rotulo: { fontFamily: fontes.dado, fontSize: 10, letterSpacing: 1.1, color: cores.apagado },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
})
