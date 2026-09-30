import { StyleSheet, Text, View } from 'react-native'
import { Aviso } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { cores, fontes } from '../../tema'

interface Props {
  codigo: string
  fotosPendentes: number
  reenviando: boolean
  aoReenviarFotos: () => void
  aoVerCaso: () => void
  aoPublicarOutro: () => void
}

export function CodigoDeEdicao({ codigo, fotosPendentes, reenviando, aoReenviarFotos, aoVerCaso, aoPublicarOutro }: Props) {
  return (
    <View style={{ gap: 18 }}>
      <Text style={estilos.titulo}>Publicado.</Text>
      <Text style={estilos.texto}>O caso já aparece no mural de quem está perto.</Text>
      <View style={estilos.caixa}>
        <Text style={estilos.rotulo}>SEU CÓDIGO DE EDIÇÃO</Text>
        <Text style={estilos.codigo} selectable accessibilityLabel={`Código ${codigo.split('').join(' ')}`}>
          {codigo}
        </Text>
      </View>
      <Aviso
        titulo="Anote ou tire um print."
        texto="É com este código que você edita ou encerra o caso sem criar conta. Ele fica guardado neste celular, mas não aparece de novo em lugar nenhum."
      />
      {fotosPendentes > 0 ? (
        <>
          <Aviso
            titulo={fotosPendentes === 1 ? 'Uma foto não subiu.' : `${fotosPendentes} fotos não subiram.`}
            texto="O caso já está publicado. Confira a internet e tente mandar a foto de novo."
          />
          <Botao rotulo="Enviar a foto de novo" variante="fraco" carregando={reenviando} aoTocar={aoReenviarFotos} />
        </>
      ) : null}
      <Botao rotulo="Ver meu caso" variante="escuro" aoTocar={aoVerCaso} />
      <Botao rotulo="Publicar outro caso" variante="fraco" aoTocar={aoPublicarOutro} />
    </View>
  )
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: fontes.tituloForte, fontSize: 28, color: cores.tapajos, letterSpacing: -0.7 },
  texto: { fontFamily: fontes.texto, fontSize: 14.5, lineHeight: 22, color: '#33474D' },
  caixa: { borderWidth: 1.6, borderColor: cores.tapajos, backgroundColor: cores.branco, padding: 18, gap: 8, alignItems: 'center' },
  rotulo: { fontFamily: fontes.dado, fontSize: 10, letterSpacing: 1.3, color: cores.apagado },
  codigo: { fontFamily: fontes.dadoMedio, fontSize: 32, letterSpacing: 4, color: cores.tapajos },
})
