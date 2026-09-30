import { useLocalSearchParams } from 'expo-router'
import { Text, View } from 'react-native'
import { cores, fontes } from '../../tema'

export default function Caso() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return (
    <View style={{ flex: 1, padding: 22, paddingTop: 60 }}>
      <Text style={{ fontFamily: fontes.titulo, fontSize: 23, color: cores.tapajos }}>Caso {id}</Text>
    </View>
  )
}
