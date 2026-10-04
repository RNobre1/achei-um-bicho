import { View, type ColorValue } from 'react-native'

// os mesmos traços do protótipo, desenhados com View para não depender de pacote de ícones

export function IconePerto({ cor }: { cor: ColorValue }) {
  const barra = { width: 20, height: 6, borderWidth: 1.6, borderColor: cor }
  return (
    <View style={{ gap: 4 }}>
      <View style={barra} />
      <View style={barra} />
    </View>
  )
}

export function IconePublicar({ cor }: { cor: ColorValue }) {
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: 16, height: 1.8, backgroundColor: cor }} />
      <View style={{ position: 'absolute', width: 1.8, height: 16, backgroundColor: cor }} />
    </View>
  )
}

export function IconePistas({ cor }: { cor: ColorValue }) {
  const lado = { width: 7, height: 12, borderWidth: 1.6, borderColor: cor }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={lado} />
      <View style={{ width: 4, height: 1.6, backgroundColor: cor }} />
      <View style={lado} />
    </View>
  )
}

