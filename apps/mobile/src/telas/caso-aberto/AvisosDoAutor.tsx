import type { AvistamentoParaAutor, TipoCaso } from '@achei/contratos'
import { StyleSheet, Text, View } from 'react-native'
import { descreverOndeFoiVisto } from '../../dominio/avistamento'
import { descreverQuando } from '../../dominio/caso-aberto'
import { cores, fontes } from '../../tema'

interface Props {
  tipo: TipoCaso
  avisos: AvistamentoParaAutor[] | undefined
  erro?: string
}

/** O que só quem publicou vê: os avisos de quem cruzou com o bicho na rua. */
export function AvisosDoAutor({ tipo, avisos, erro }: Props) {
  return (
    <View style={estilos.caixa}>
      <Text style={estilos.selo}>ESTE CASO É SEU · SÓ VOCÊ VÊ ESTA PARTE</Text>
      <Text style={estilos.titulo}>
        {avisos === undefined
          ? 'Avisos de quem viu'
          : avisos.length === 0
            ? 'Ninguém avisou ainda'
            : avisos.length === 1
              ? '1 aviso de quem viu'
              : `${avisos.length} avisos de quem viu`}
      </Text>
      {erro ? <Text style={estilos.texto}>{erro}</Text> : null}
      {avisos?.length === 0 ? (
        <Text style={estilos.texto}>Quando alguém tocar em “Vi esse bicho na rua”, o aviso aparece aqui.</Text>
      ) : null}
      {avisos?.map((aviso) => (
        <View key={aviso.id} style={estilos.aviso}>
          <Text style={estilos.quando}>{descreverQuando(aviso.vistoEm)}</Text>
          <Text style={estilos.onde}>{descreverOndeFoiVisto(aviso, tipo)}</Text>
          {aviso.observacao ? <Text style={estilos.texto}>{aviso.observacao}</Text> : null}
        </View>
      ))}
    </View>
  )
}

const estilos = StyleSheet.create({
  caixa: { borderWidth: 1.6, borderColor: cores.tapajos, backgroundColor: cores.branco, padding: 16, gap: 10 },
  selo: { fontFamily: fontes.dadoMedio, fontSize: 9.5, letterSpacing: 1.1, color: cores.perdi },
  titulo: { fontFamily: fontes.titulo, fontSize: 19, color: cores.tapajos },
  aviso: { gap: 3, paddingTop: 10, borderTopWidth: 1, borderTopColor: cores.traco },
  quando: { fontFamily: fontes.textoForte, fontSize: 14, color: cores.texto },
  onde: { fontFamily: fontes.dado, fontSize: 11, color: cores.apagado },
  texto: { fontFamily: fontes.texto, fontSize: 13.5, lineHeight: 20, color: '#33474D' },
})
