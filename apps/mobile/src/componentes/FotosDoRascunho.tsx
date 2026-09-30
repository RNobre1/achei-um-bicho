import { FOTO } from '@achei/contratos'
import { useState } from 'react'
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { podeAcrescentarFoto } from '../dominio/foto'
import { escolherFoto, type OrigemDaFoto } from '../servicos/fotos'
import { cores, fontes } from '../tema'

interface Props {
  fotos: string[]
  aoMudar: (fotos: string[]) => void
}

// na web não há câmera confiável: só o seletor de arquivo
const ORIGENS: { origem: OrigemDaFoto; rotulo: string }[] =
  Platform.OS === 'web'
    ? [{ origem: 'galeria', rotulo: 'Escolher foto' }]
    : [
        { origem: 'camera', rotulo: 'Tirar foto' },
        { origem: 'galeria', rotulo: 'Da galeria' },
      ]

export function FotosDoRascunho({ fotos, aoMudar }: Props) {
  const [preparando, setPreparando] = useState(false)

  async function acrescentar(origem: OrigemDaFoto) {
    setPreparando(true)
    try {
      const uri = await escolherFoto(origem)
      if (uri) aoMudar([...fotos, uri])
    } finally {
      setPreparando(false)
    }
  }

  return (
    <View style={estilos.grupo}>
      <Text style={estilos.rotulo}>FOTO · ATÉ {FOTO.maximoPorCaso}</Text>
      <View style={estilos.linha}>
        {fotos.map((uri, i) => (
          <Pressable
            key={uri}
            onPress={() => aoMudar(fotos.filter((f) => f !== uri))}
            accessibilityRole="button"
            accessibilityLabel={`Remover foto ${i + 1}`}
          >
            <Image source={{ uri }} style={estilos.miniatura} />
            <Text style={estilos.remover}>×</Text>
          </Pressable>
        ))}
        {preparando ? (
          <View style={[estilos.miniatura, estilos.vazia]}>
            <ActivityIndicator color={cores.tapajos} />
          </View>
        ) : podeAcrescentarFoto(fotos) ? (
          ORIGENS.map(({ origem, rotulo }) => (
            <Pressable
              key={origem}
              onPress={() => void acrescentar(origem)}
              accessibilityRole="button"
              style={[estilos.miniatura, estilos.vazia]}
            >
              <Text style={estilos.mais}>+</Text>
              <Text style={estilos.origem}>{rotulo}</Text>
            </Pressable>
          ))
        ) : null}
      </View>
    </View>
  )
}

const estilos = StyleSheet.create({
  grupo: { gap: 8 },
  rotulo: { fontFamily: fontes.dado, fontSize: 10, letterSpacing: 1.1, color: cores.apagado },
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  miniatura: { width: 86, height: 86 },
  vazia: { borderWidth: 1.4, borderStyle: 'dashed', borderColor: cores.traco, alignItems: 'center', justifyContent: 'center', gap: 2 },
  mais: { fontFamily: fontes.texto, fontSize: 23, color: cores.apagado, lineHeight: 26 },
  origem: { fontFamily: fontes.textoMedio, fontSize: 11, color: cores.apagado },
  remover: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    textAlign: 'center',
    lineHeight: 19,
    backgroundColor: 'rgba(18,62,74,0.8)',
    color: cores.branco,
    fontFamily: fontes.textoForte,
    fontSize: 14,
  },
})
