import { TIPO_CASO, type TipoCaso } from '@achei/contratos'
import { StyleSheet, Text, View } from 'react-native'
import { cores, fontes } from '../tema'

// a cor carrega o significado: azul da água para quem sumiu, silte para quem foi achado
const FUNDO: Record<TipoCaso, string> = { perdido: cores.perdi, encontrado: cores.achei }

export function Etiqueta({ tipo }: { tipo: TipoCaso }) {
  return (
    <View style={[estilos.caixa, { backgroundColor: FUNDO[tipo] }]}>
      <Text style={estilos.texto}>{TIPO_CASO.entradas[tipo].rotulo.toUpperCase()}</Text>
    </View>
  )
}

const estilos = StyleSheet.create({
  caixa: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4 },
  texto: { fontFamily: fontes.dadoMedio, fontSize: 10, letterSpacing: 1.2, color: cores.branco },
})
