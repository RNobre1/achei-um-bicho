import { StyleSheet, View } from 'react-native'
import { cores } from '../tema'

/** Barra de progresso do protótipo: feito, agora e o que falta. */
export function Passos({ total, atual }: { total: number; atual: number }) {
  return (
    <View style={estilos.linha} accessibilityLabel={`Passo ${atual + 1} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[estilos.passo, i < atual && estilos.feito, i === atual && estilos.agora]} />
      ))}
    </View>
  )
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', gap: 5 },
  passo: { flex: 1, height: 4, backgroundColor: cores.traco },
  feito: { backgroundColor: cores.tapajos },
  agora: { backgroundColor: cores.alter },
})
