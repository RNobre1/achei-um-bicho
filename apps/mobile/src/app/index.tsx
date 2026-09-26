import { Text, View } from 'react-native'
import { cores, fontes } from '../tema'

export default function Inicio() {
  return (
    <View style={{ flex: 1, padding: 22, paddingTop: 60 }}>
      <Text style={{ fontFamily: fontes.tituloForte, fontSize: 25, color: cores.tapajos }}>Achei um bicho</Text>
    </View>
  )
}
