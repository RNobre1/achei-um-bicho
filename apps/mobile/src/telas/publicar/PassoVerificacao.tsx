import { StyleSheet, Text, View } from 'react-native'
import { Aviso } from '../../componentes/Aviso'
import { Campo } from '../../componentes/Campo'
import type { RascunhoPublicacao } from '../../dominio/publicacao'
import { cores, fontes } from '../../tema'

interface Props {
  rascunho: RascunhoPublicacao
  mudar: (alterar: (r: RascunhoPublicacao) => RascunhoPublicacao) => void
}

export function PassoVerificacao({ rascunho, mudar }: Props) {
  const mudarPergunta = (indice: number, parte: Partial<RascunhoPublicacao['perguntas'][number]>) =>
    mudar((r) => ({ ...r, perguntas: r.perguntas.map((p, i) => (i === indice ? { ...p, ...parte } : p)) }))
  const quem = rascunho.tipo === 'perdido' ? 'quem disser ter achado' : 'quem disser ser o tutor'

  return (
    <View style={{ gap: 18 }}>
      <Aviso titulo="Ninguém mais vê essas respostas." texto={`Elas servem para conferir ${quem} antes de qualquer contato.`} />
      {rascunho.perguntas.map((pergunta, i) => (
        <View key={i} style={estilos.pergunta}>
          <Text style={estilos.rotulo}>PERGUNTA {i + 1} DE 3</Text>
          <Campo rotulo="Pergunta" valor={pergunta.enunciado} aoMudar={(enunciado) => mudarPergunta(i, { enunciado })} maxLength={160} />
          <Campo rotulo="Resposta" valor={pergunta.resposta} aoMudar={(resposta) => mudarPergunta(i, { resposta })} maxLength={160} />
        </View>
      ))}
      <View style={estilos.pergunta}>
        <Campo
          rotulo="Seu nome ou apelido"
          valor={rascunho.autor.nome}
          aoMudar={(nome) => mudar((r) => ({ ...r, autor: { ...r.autor, nome } }))}
          maxLength={80}
        />
        <Campo
          rotulo="Telefone (opcional)"
          valor={rascunho.autor.telefone}
          aoMudar={(telefone) => mudar((r) => ({ ...r, autor: { ...r.autor, telefone } }))}
          keyboardType="phone-pad"
          maxLength={20}
          dica="Não aparece no caso. Só é liberado quando você aceitar a resposta de alguém."
        />
      </View>
    </View>
  )
}

const estilos = StyleSheet.create({
  pergunta: { gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: cores.traco },
  rotulo: { fontFamily: fontes.dadoMedio, fontSize: 10.5, letterSpacing: 1.1, color: cores.perdi },
})
