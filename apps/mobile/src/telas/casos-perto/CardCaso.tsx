import type { CasoNoMural } from '@achei/contratos'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { Etiqueta } from '../../componentes/Etiqueta'
import { Placa } from '../../componentes/Placa'
import { formatarDistancia, formatarTempoDesde } from '../../dominio/formatar'
import { descreverAnimal, nomeDoAnimal } from '../../dominio/mural'
import { api } from '../../servicos/api'
import { cores, fontes } from '../../tema'

export function CardCaso({ caso, aoTocar }: { caso: CasoNoMural; aoTocar: () => void }) {
  const onde = [caso.bairro, formatarDistancia(caso.distanciaM)].filter(Boolean).join(' · ')
  return (
    <Pressable onPress={aoTocar} accessibilityRole="button" style={estilos.card}>
      {caso.foto ? (
        <Image source={{ uri: api.urlDaFoto(caso.foto) }} style={estilos.foto} accessibilityLabel={`Foto de ${nomeDoAnimal(caso.animal)}`} />
      ) : (
        <Placa rotulo="foto" silte={caso.tipo === 'encontrado'} estilo={estilos.foto} />
      )}
      <View style={estilos.texto}>
        <View style={estilos.topo}>
          <Etiqueta tipo={caso.tipo} />
          <Text style={estilos.quando}>{formatarTempoDesde(caso.publicadoEm)}</Text>
        </View>
        <Text style={estilos.nome}>{nomeDoAnimal(caso.animal)}</Text>
        <Text style={estilos.descricao}>{descreverAnimal(caso.animal)}</Text>
        <Text style={estilos.onde}>{onde}</Text>
      </View>
    </Pressable>
  )
}

const estilos = StyleSheet.create({
  card: { flexDirection: 'row', gap: 13, paddingHorizontal: 22, paddingVertical: 14, backgroundColor: cores.chuva },
  foto: { width: 80, height: 80 },
  texto: { flex: 1, gap: 4 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quando: { fontFamily: fontes.dado, fontSize: 11, color: cores.apagado },
  nome: { fontFamily: fontes.titulo, fontSize: 17, color: cores.tapajos, letterSpacing: -0.3 },
  descricao: { fontFamily: fontes.texto, fontSize: 13, lineHeight: 19, color: '#3A4C52' },
  onde: { fontFamily: fontes.dado, fontSize: 11, color: cores.apagado },
})
