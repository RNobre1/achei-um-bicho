import { StyleSheet, Text, View } from 'react-native'
import { cores, fontes } from '../tema'

/** Linha com o quadradinho do protótipo: cheio quando bate, vazio quando não. */
export function LinhaMarcada({ bate, destaque, resto }: { bate: boolean; destaque: string; resto: string }) {
  return (
    <View style={estilos.linha} accessibilityLabel={`${bate ? 'Bate' : 'Não bate'}: ${destaque}${resto}`}>
      <View style={[estilos.caixa, bate && estilos.caixaBate]}>{bate ? <View style={estilos.miolo} /> : null}</View>
      <Text style={estilos.texto}>
        {destaque ? <Text style={estilos.destaque}>{destaque}</Text> : null}
        {resto}
      </Text>
    </View>
  )
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  caixa: { width: 16, height: 16, borderWidth: 1.5, borderColor: cores.traco, marginTop: 2, alignItems: 'center', justifyContent: 'center' },
  caixaBate: { borderColor: cores.perdi },
  miolo: { width: 8, height: 8, backgroundColor: cores.perdi },
  texto: { flex: 1, fontFamily: fontes.texto, fontSize: 14, lineHeight: 20, color: '#33474D' },
  destaque: { fontFamily: fontes.textoForte, color: cores.texto },
})
