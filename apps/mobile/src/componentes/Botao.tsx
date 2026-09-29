import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { cores, fontes } from '../tema'

type Variante = 'acento' | 'escuro' | 'fraco'

interface Props {
  rotulo: string
  aoTocar: () => void
  variante?: Variante
  desativado?: boolean
  carregando?: boolean
}

/** O amarelo de Alter do Chão é o único acento: só a ação principal da tela usa. */
export function Botao({ rotulo, aoTocar, variante = 'escuro', desativado, carregando }: Props) {
  const inativo = desativado || carregando
  return (
    <Pressable
      onPress={aoTocar}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo }}
      style={[estilos.base, estilos[variante], inativo && estilos.inativo]}
    >
      {carregando ? (
        <ActivityIndicator color={variante === 'escuro' ? cores.branco : cores.tapajos} />
      ) : (
        <Text style={[estilos.texto, estilos[`texto_${variante}`]]}>{rotulo}</Text>
      )}
    </Pressable>
  )
}

const estilos = StyleSheet.create({
  base: { paddingVertical: 15, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1.6 },
  acento: { backgroundColor: cores.alter, borderColor: cores.alter },
  escuro: { backgroundColor: cores.tapajos, borderColor: cores.tapajos },
  fraco: { backgroundColor: 'transparent', borderColor: cores.traco },
  inativo: { opacity: 0.45 },
  texto: { fontFamily: fontes.textoForte, fontSize: 15 },
  texto_acento: { color: cores.tapajos },
  texto_escuro: { color: cores.branco },
  texto_fraco: { color: cores.apagado, fontFamily: fontes.textoMedio },
})
