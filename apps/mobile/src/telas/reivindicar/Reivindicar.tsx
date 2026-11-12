import { LIMITES_DE_TEXTO } from '@achei/contratos'
import type { CasoAberto, PerguntaPublica } from '@achei/contratos'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Aviso } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { Campo } from '../../componentes/Campo'
import { Voltar } from '../../componentes/Voltar'
import { nomeDoAnimal } from '../../dominio/mural'
import {
  AVISO_APP_NAO_DECIDE,
  formularioReivindicacaoValido,
  montarPedidoReivindicacao,
  pedeReferencia,
  rotuloBotaoReivindicar,
} from '../../dominio/reivindicacao'
import { api, ErroApi } from '../../servicos/api'
import { meuCaso } from '../../servicos/meus-casos'
import { guardarMinhaReivindicacao } from '../../servicos/minhas-reivindicacoes'
import { cores, fontes } from '../../tema'

export function Reivindicar() {
  const { id, casoProprio } = useLocalSearchParams<{ id: string; casoProprio?: string }>()
  const router = useRouter()
  const margens = useSafeAreaInsets()

  const [caso, setCaso] = useState<CasoAberto>()
  const [perguntas, setPerguntas] = useState<PerguntaPublica[]>()
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [referencia, setReferencia] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string>()
  const [avisoPista, setAvisoPista] = useState<string>()
  const [avisoNaoSalvo, setAvisoNaoSalvo] = useState<string>()
  const [codigoGerado, setCodigoGerado] = useState<string>()
  const [reivindicacaoId, setReivindicacaoId] = useState<string>()

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(undefined)
    try {
      const [casoLido, perguntasLidas] = await Promise.all([api.abrirCaso(id), api.perguntas(id)])
      setCaso(casoLido)
      setPerguntas(perguntasLidas)
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não deu para carregar as perguntas do caso.')
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    void carregar()
  }, [carregar])

  useEffect(() => {
    async function checarCasoProprio() {
      if (casoProprio) {
        const meu = await meuCaso(casoProprio)
        if (!meu) {
          setAvisoPista(
            'Seu caso próprio não foi encontrado neste celular. A reivindicação será enviada sem o vínculo com a pista.',
          )
        }
      }
    }
    void checarCasoProprio()
  }, [casoProprio])

  async function enviar() {
    if (!caso || !perguntas) return
    setEnviando(true)
    setErro(undefined)

    try {
      let dadosCasoProprio: { id: string; codigoEdicao: string } | undefined
      if (casoProprio) {
        const meu = await meuCaso(casoProprio)
        if (meu) {
          dadosCasoProprio = { id: casoProprio, codigoEdicao: meu.codigoEdicao }
        }
      }

      const payload = montarPedidoReivindicacao({
        respostas: perguntas.map((p) => ({
          perguntaId: p.id,
          texto: respostas[p.id] ?? '',
        })),
        nome,
        telefone,
        tipoCaso: caso.tipo,
        referencia,
        casoProprio: dadosCasoProprio,
      })

      const resultado = await api.reivindicar(id, payload)

      // Mostra o código de acompanhamento primeiro
      setCodigoGerado(resultado.codigoAcompanhamento)
      setReivindicacaoId(resultado.id)

      // Salva no aparelho num try/catch separado
      try {
        await guardarMinhaReivindicacao({
          id: resultado.id,
          casoId: id,
          tipoCaso: caso.tipo,
          codigoAcompanhamento: resultado.codigoAcompanhamento,
          criadoEm: new Date().toISOString(),
          nomeAnimal: nomeDoAnimal(caso.animal),
        })
      } catch {
        setAvisoNaoSalvo('Anote este código: ele não ficou guardado no celular')
      }
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não deu para enviar a reivindicação.')
    } finally {
      setEnviando(false)
    }
  }

  const valido =
    caso && perguntas
      ? formularioReivindicacaoValido({
          tipoCaso: caso.tipo,
          respostas: perguntas.map((p) => ({ perguntaId: p.id, texto: respostas[p.id] ?? '' })),
          pessoa: { nome, telefone, referencia },
        })
      : false

  if (codigoGerado && reivindicacaoId) {
    return (
      <View style={[estilos.tela, { paddingTop: margens.top + 20 }]}>
        <ScrollView contentContainerStyle={[estilos.conteudo, { paddingBottom: margens.bottom + 24 }]}>
          <Text style={estilos.sucessoSelo}>REIVINDICAÇÃO ENVIADA</Text>
          <Text style={estilos.titulo}>Respostas enviadas com sucesso</Text>
          <Text style={estilos.paragrafo}>
            Quem publicou vai conferir as respostas ao lado das que cadastrou. Se estiverem certas, o contato será liberado.
          </Text>

          <View style={estilos.caixaCodigo}>
            <Text style={estilos.rotuloCodigo}>SEU CÓDIGO DE ACOMPANHAMENTO</Text>
            <Text style={estilos.codigo}>{codigoGerado}</Text>
            <Text style={[estilos.dicaCodigo, avisoNaoSalvo ? estilos.dicaAlerta : null]}>
              {avisoNaoSalvo ?? 'Ele já foi salvo neste aparelho e você pode acompanhar a resposta na aba Meus casos.'}
            </Text>
          </View>

          <Botao
            rotulo="Acompanhar situação"
            variante="acento"
            aoTocar={() => router.replace(`/reivindicacao/${reivindicacaoId}`)}
          />
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={[estilos.tela, { paddingTop: margens.top + 10 }]}>
      <View style={estilos.topo}>
        <Voltar rotulo="Voltar ao caso" />
      </View>

      {carregando ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={cores.tapajos} />
      ) : erro && !caso ? (
        <View style={estilos.estado}>
          <Text style={estilos.titulo}>Não foi possível carregar</Text>
          <Text style={estilos.paragrafo}>{erro}</Text>
          <Botao rotulo="Tentar de novo" aoTocar={() => void carregar()} />
        </View>
      ) : caso && perguntas ? (
        <ScrollView contentContainerStyle={[estilos.conteudo, { paddingBottom: margens.bottom + 24 }]}>
          <Text style={estilos.titulo}>{rotuloBotaoReivindicar(caso.tipo)}</Text>

          {avisoPista ? <Aviso titulo="Atenção ao vínculo" texto={avisoPista} /> : null}

          <Aviso titulo="Como funciona a verificação" texto={AVISO_APP_NAO_DECIDE} />

          {erro ? <Text style={estilos.erro}>{erro}</Text> : null}

          <View style={estilos.secao}>
            <Text style={estilos.secaoTitulo}>Responda às 3 perguntas de quem publicou</Text>
            {perguntas.map((p) => (
              <Campo
                key={p.id}
                rotulo={`Pergunta ${p.ordem}: ${p.enunciado}`}
                valor={respostas[p.id] ?? ''}
                aoMudar={(texto) => setRespostas((atuais) => ({ ...atuais, [p.id]: texto }))}
                placeholder="Sua resposta sobre o sinal do animal"
                multiline
                maxLength={LIMITES_DE_TEXTO.respostaReivindicacao}
              />
            ))}
          </View>

          <View style={estilos.secao}>
            <Text style={estilos.secaoTitulo}>Seus dados para contato</Text>
            <Campo
              rotulo="Seu nome"
              valor={nome}
              aoMudar={setNome}
              placeholder="Como a outra pessoa deve te chamar"
              maxLength={LIMITES_DE_TEXTO.nomePessoa}
            />
            <Campo
              rotulo="Seu telefone com DDD"
              valor={telefone}
              aoMudar={setTelefone}
              placeholder="(93) 99123-4567"
              keyboardType="phone-pad"
              maxLength={LIMITES_DE_TEXTO.telefone}
              dica="Só será revelado se quem publicou aceitar suas respostas."
            />
            {pedeReferencia(caso.tipo) ? (
              <Campo
                rotulo="Onde o bicho está agora?"
                valor={referencia}
                aoMudar={setReferencia}
                placeholder="Ex: No quintal da minha casa, na rua tal perto do mercado"
                multiline
                maxLength={LIMITES_DE_TEXTO.referencia}
                dica="Ponto de referência para o tutor saber onde buscar o animal quando aceitar."
              />
            ) : null}
          </View>

          <Botao
            rotulo="Enviar respostas"
            variante="acento"
            desativado={!valido}
            carregando={enviando}
            aoTocar={() => void enviar()}
          />
        </ScrollView>
      ) : null}
    </View>
  )
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.chuva },
  topo: { paddingHorizontal: 22, paddingBottom: 10 },
  conteudo: { paddingHorizontal: 22, paddingTop: 10, gap: 18 },
  titulo: { fontFamily: fontes.tituloForte, fontSize: 24, color: cores.tapajos, letterSpacing: -0.6 },
  paragrafo: { fontFamily: fontes.texto, fontSize: 14.5, lineHeight: 22, color: '#33474D' },
  secao: { gap: 12 },
  secaoTitulo: { fontFamily: fontes.titulo, fontSize: 16, color: cores.tapajos },
  erro: { fontFamily: fontes.texto, fontSize: 13, color: '#A02020' },
  estado: { paddingHorizontal: 22, paddingTop: 40, gap: 14 },
  sucessoSelo: { fontFamily: fontes.dadoMedio, fontSize: 11, letterSpacing: 1.2, color: cores.achei },
  caixaCodigo: {
    padding: 16,
    backgroundColor: cores.branco,
    borderWidth: 1.6,
    borderColor: cores.tapajos,
    gap: 8,
    alignItems: 'center',
  },
  rotuloCodigo: { fontFamily: fontes.dado, fontSize: 10.5, letterSpacing: 1.1, color: cores.apagado },
  codigo: { fontFamily: fontes.dadoMedio, fontSize: 24, letterSpacing: 2, color: cores.tapajos },
  dicaCodigo: { fontFamily: fontes.texto, fontSize: 12.5, textAlign: 'center', color: cores.apagado },
  dicaAlerta: { color: '#B02020', fontFamily: fontes.textoForte },
})
