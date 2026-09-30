import type { TipoCaso } from '@achei/contratos'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { cores, fontes } from '../../tema'

// os dois lados do caso têm frase própria nesta tela, mas as chaves são as do
// vocabulário: um tipo novo obriga a escrever o texto dele aqui
const OPCOES: Record<TipoCaso, { titulo: string; texto: string }> = {
  perdido: {
    titulo: 'Meu bicho sumiu',
    texto: 'O aviso chega primeiro a quem mora perto de onde ele sumiu.',
  },
  encontrado: {
    titulo: 'Achei um bicho na rua',
    texto: 'Sem criar conta. Você recebe um código para editar ou encerrar depois.',
  },
}

export function PassoTipo({ marcado, aoEscolher }: { marcado?: TipoCaso; aoEscolher: (tipo: TipoCaso) => void }) {
  return (
    <View style={estilos.lista}>
      {(Object.keys(OPCOES) as TipoCaso[]).map((tipo) => (
        <Pressable
          key={tipo}
          onPress={() => aoEscolher(tipo)}
          accessibilityRole="button"
          accessibilityState={{ selected: marcado === tipo }}
          style={[estilos.opcao, marcado === tipo && estilos.marcada]}
        >
          <View style={[estilos.faixa, { backgroundColor: tipo === 'perdido' ? cores.perdi : cores.achei }]} />
          <View style={estilos.textos}>
            <Text style={estilos.titulo}>{OPCOES[tipo].titulo}</Text>
            <Text style={estilos.texto}>{OPCOES[tipo].texto}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  )
}

const estilos = StyleSheet.create({
  lista: { gap: 12 },
  opcao: { flexDirection: 'row', backgroundColor: cores.branco, borderWidth: 1.4, borderColor: cores.traco },
  marcada: { borderColor: cores.tapajos, borderWidth: 2 },
  faixa: { width: 6 },
  textos: { flex: 1, padding: 16, gap: 5 },
  titulo: { fontFamily: fontes.titulo, fontSize: 19, color: cores.tapajos },
  texto: { fontFamily: fontes.texto, fontSize: 13.5, lineHeight: 20, color: cores.apagado },
})
