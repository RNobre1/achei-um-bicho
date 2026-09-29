import { StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { cores, fontes } from '../tema'

interface Props {
  rotulo?: string
  silte?: boolean
  estilo?: ViewStyle
}

/**
 * Lugar da foto enquanto ela não existe: campo marcado com a etiqueta do que vai
 * ali, sem foto simulada nem silhueta de bicho, como no protótipo.
 */
export function Placa({ rotulo, silte, estilo }: Props) {
  return (
    <View style={[estilos.placa, silte && estilos.silte, estilo]}>
      <View style={[estilos.canto, estilos.cantoSuperior]} />
      <View style={[estilos.canto, estilos.cantoInferior]} />
      {rotulo ? <Text style={estilos.rotulo}>{rotulo.toUpperCase()}</Text> : null}
    </View>
  )
}

const estilos = StyleSheet.create({
  placa: { backgroundColor: '#E4E8E3', justifyContent: 'flex-end', padding: 7 },
  silte: { backgroundColor: '#D8D2C4' },
  canto: { position: 'absolute', width: 13, height: 13, borderColor: 'rgba(18,62,74,0.4)' },
  cantoSuperior: { top: 7, left: 7, borderTopWidth: 1, borderLeftWidth: 1 },
  cantoInferior: { bottom: 7, right: 7, borderBottomWidth: 1, borderRightWidth: 1 },
  rotulo: {
    alignSelf: 'flex-start',
    fontFamily: fontes.dado,
    fontSize: 9,
    letterSpacing: 1,
    color: '#4A5D63',
    backgroundColor: 'rgba(238,242,238,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
})
