import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { cores, fontes } from '../tema'

interface Props extends Omit<TextInputProps, 'style' | 'onChangeText' | 'value'> {
  rotulo: string
  valor: string
  aoMudar: (texto: string) => void
  dica?: string
}

export function Campo({ rotulo, valor, aoMudar, dica, multiline, ...resto }: Props) {
  return (
    <View style={estilos.grupo}>
      <Text style={estilos.rotulo}>{rotulo.toUpperCase()}</Text>
      <TextInput
        value={valor}
        onChangeText={aoMudar}
        multiline={multiline}
        placeholderTextColor={cores.apagado}
        style={[estilos.campo, multiline && estilos.multilinha]}
        accessibilityLabel={rotulo}
        {...resto}
      />
      {dica ? <Text style={estilos.dica}>{dica}</Text> : null}
    </View>
  )
}

const estilos = StyleSheet.create({
  grupo: { gap: 6 },
  rotulo: { fontFamily: fontes.dado, fontSize: 10, letterSpacing: 1.1, color: cores.apagado },
  campo: {
    fontFamily: fontes.texto,
    fontSize: 15,
    color: cores.texto,
    backgroundColor: cores.branco,
    borderWidth: 1.4,
    borderColor: cores.traco,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  multilinha: { minHeight: 84, textAlignVertical: 'top' },
  dica: { fontFamily: fontes.texto, fontSize: 12, lineHeight: 17, color: cores.apagado },
})
