import { TIPO_CASO, type Pista, type TipoCaso } from '@achei/contratos'
import { Image, StyleSheet, Text, View } from 'react-native'
import { Botao } from '../../componentes/Botao'
import { LinhaMarcada } from '../../componentes/LinhaMarcada'
import { Placa } from '../../componentes/Placa'
import { nomeDoAnimal } from '../../dominio/mural'
import { linhasDaPista, pareceForte } from '../../dominio/pistas'
import { api } from '../../servicos/api'
import { cores, fontes } from '../../tema'

// rótulo curto da placa de cada lado; as chaves vêm do vocabulário
const NA_PLACA: Record<TipoCaso, string> = { perdido: 'sumiu', encontrado: 'achado' }

interface Props {
  pista: Pista
  meuTipo: TipoCaso
  meuNome: string
  minhaFoto?: string
  descartando: boolean
  aoAbrir: () => void
  aoDescartar: () => void
}

export function CardDaPista({ pista, meuTipo, meuNome, minhaFoto, descartando, aoAbrir, aoDescartar }: Props) {
  const outro = pista.outro
  return (
    <View style={estilos.par}>
      <View style={estilos.faces}>
        <View style={estilos.face}>
          {minhaFoto ? (
            <Image source={{ uri: api.urlDaFoto(minhaFoto) }} style={estilos.foto} accessibilityLabel={`Foto do seu caso: ${meuNome}`} />
          ) : (
            <Placa rotulo={NA_PLACA[meuTipo]} silte={meuTipo === 'encontrado'} estilo={estilos.foto} />
          )}
          <Text style={estilos.legenda} numberOfLines={1}>
            {meuNome.toUpperCase()} · SEU CASO
          </Text>
        </View>
        <View style={estilos.no}>
          <View style={[estilos.metade, { backgroundColor: cores.achei }]} />
          <View style={[estilos.metade, { backgroundColor: cores.perdi }]} />
        </View>
        <View style={estilos.face}>
          {outro.foto ? (
            <Image source={{ uri: api.urlDaFoto(outro.foto) }} style={estilos.foto} accessibilityLabel={`Foto do caso: ${TIPO_CASO.entradas[outro.tipo].rotulo}`} />
          ) : (
            <Placa rotulo={NA_PLACA[outro.tipo]} silte={outro.tipo === 'encontrado'} estilo={estilos.foto} />
          )}
          <Text style={estilos.legenda} numberOfLines={1}>
            {(outro.bairro ?? nomeDoAnimal(outro.animal)).toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={estilos.linhas}>
        {linhasDaPista(pista, meuTipo).map((linha, i) => (
          <LinhaMarcada key={i} {...linha} />
        ))}
      </View>

      <View style={estilos.dupla}>
        <View style={estilos.metadeBotao}>
          <Botao rotulo="Pode ser ele" variante={pareceForte(pista) ? 'acento' : 'fraco'} aoTocar={aoAbrir} />
        </View>
        <View style={estilos.metadeBotao}>
          <Botao rotulo="Não é" variante="fraco" carregando={descartando} aoTocar={aoDescartar} />
        </View>
      </View>
    </View>
  )
}

const estilos = StyleSheet.create({
  par: { paddingHorizontal: 22, paddingVertical: 20, gap: 14, borderBottomWidth: 1, borderBottomColor: cores.traco },
  faces: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  face: { flex: 1, gap: 7 },
  foto: { width: '100%', aspectRatio: 1.7 },
  legenda: { fontFamily: fontes.dado, fontSize: 10, letterSpacing: 1, color: cores.apagado },
  no: { width: 13, height: 13, flexDirection: 'row', overflow: 'hidden', transform: [{ rotate: '45deg' }], borderWidth: 1.2, borderColor: cores.tapajos, marginBottom: 20 },
  metade: { flex: 1 },
  linhas: { gap: 9 },
  dupla: { flexDirection: 'row', gap: 10 },
  metadeBotao: { flex: 1 },
})
