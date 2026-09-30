import type { TipoCaso } from '@achei/contratos'
import { useRouter } from 'expo-router'
import { useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Aviso } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { Passos } from '../../componentes/Passos'
import { nomeDoAnimal } from '../../dominio/mural'
import { montarPublicacao, PASSOS, pendenciasDoPasso, rascunhoVazio, type RascunhoPublicacao } from '../../dominio/publicacao'
import { api, ErroApi } from '../../servicos/api'
import { guardarMeuCaso } from '../../servicos/meus-casos'
import { cores, fontes } from '../../tema'
import { CodigoDeEdicao } from './CodigoDeEdicao'
import { PassoAnimal } from './PassoAnimal'
import { PassoOndeQuando } from './PassoOndeQuando'
import { PassoTipo } from './PassoTipo'
import { PassoVerificacao } from './PassoVerificacao'

const SUBTITULO: Record<TipoCaso, string> = { perdido: 'Meu bicho sumiu', encontrado: 'Achei um bicho na rua' }

export function Publicar() {
  const router = useRouter()
  const margens = useSafeAreaInsets()
  const rolagem = useRef<ScrollView>(null)
  const [indice, setIndice] = useState(0)
  const [rascunho, setRascunho] = useState<RascunhoPublicacao>()
  const [pendencias, setPendencias] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string>()
  const [publicado, setPublicado] = useState<{ id: string; codigo: string }>()

  const passo = PASSOS[indice]!
  const mudar = (alterar: (r: RascunhoPublicacao) => RascunhoPublicacao) => {
    setPendencias([])
    setRascunho((r) => (r ? alterar(r) : r))
  }

  function irPara(novo: number) {
    setPendencias([])
    setErro(undefined)
    setIndice(novo)
    rolagem.current?.scrollTo({ y: 0, animated: false })
  }

  function escolherTipo(tipo: TipoCaso) {
    // trocar de lado recomeça o rascunho: as perguntas sugeridas são outras
    if (rascunho?.tipo !== tipo) setRascunho(rascunhoVazio(tipo))
    irPara(1)
  }

  async function publicar(r: RascunhoPublicacao) {
    setEnviando(true)
    setErro(undefined)
    try {
      const corpo = montarPublicacao(r)
      const resposta = await api.publicar(corpo)
      await guardarMeuCaso({
        id: resposta.id,
        tipo: resposta.tipo,
        codigoEdicao: resposta.codigoEdicao,
        nome: nomeDoAnimal({ especie: corpo.animal.especie, nome: corpo.animal.nome ?? null }),
        publicadoEm: new Date().toISOString(),
      })
      setPublicado({ id: resposta.id, codigo: resposta.codigoEdicao })
      rolagem.current?.scrollTo({ y: 0, animated: false })
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não deu para publicar. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  function continuar() {
    if (!rascunho) return
    const falta = pendenciasDoPasso(rascunho, passo.id)
    if (falta.length > 0) {
      setPendencias(falta)
      return
    }
    if (indice < PASSOS.length - 1) irPara(indice + 1)
    else void publicar(rascunho)
  }

  function recomecar() {
    setPublicado(undefined)
    setRascunho(undefined)
    irPara(0)
  }

  return (
    <KeyboardAvoidingView style={estilos.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={rolagem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[estilos.conteudo, { paddingTop: margens.top + 14 }]}
      >
        {publicado ? (
          <CodigoDeEdicao
            codigo={publicado.codigo}
            aoVerCaso={() => router.push(`/caso/${publicado.id}`)}
            aoPublicarOutro={recomecar}
          />
        ) : (
          <>
            {indice > 0 ? (
              <Pressable onPress={() => irPara(indice - 1)} accessibilityRole="button" hitSlop={10}>
                <Text style={estilos.voltar}>‹  Voltar</Text>
              </Pressable>
            ) : null}
            <Passos total={PASSOS.length} atual={indice} />
            <View style={{ gap: 6 }}>
              <Text style={estilos.rotulo}>
                PASSO {indice + 1} DE {PASSOS.length}
                {rascunho && indice > 0 ? ` · ${SUBTITULO[rascunho.tipo].toUpperCase()}` : ''}
              </Text>
              <Text style={estilos.titulo}>{passo.titulo}</Text>
            </View>

            {passo.id === 'tipo' ? <PassoTipo marcado={rascunho?.tipo} aoEscolher={escolherTipo} /> : null}
            {rascunho && passo.id === 'animal' ? <PassoAnimal rascunho={rascunho} mudar={mudar} /> : null}
            {rascunho && passo.id === 'ondeQuando' ? <PassoOndeQuando rascunho={rascunho} mudar={mudar} /> : null}
            {rascunho && passo.id === 'verificacao' ? <PassoVerificacao rascunho={rascunho} mudar={mudar} /> : null}

            {pendencias.length > 0 ? <Aviso titulo="Falta pouco:" texto={pendencias.join('\n')} /> : null}
            {erro ? <Aviso titulo="Não deu para publicar." texto={erro} /> : null}

            {passo.id !== 'tipo' ? (
              <Botao
                rotulo={indice === PASSOS.length - 1 ? 'Publicar' : 'Continuar'}
                variante={indice === PASSOS.length - 1 ? 'acento' : 'escuro'}
                carregando={enviando}
                aoTocar={continuar}
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.chuva },
  conteudo: { paddingHorizontal: 22, paddingBottom: 40, gap: 18 },
  voltar: { fontFamily: fontes.textoMedio, fontSize: 15, color: cores.apagado },
  rotulo: { fontFamily: fontes.dado, fontSize: 10.5, letterSpacing: 1.1, color: cores.apagado },
  titulo: { fontFamily: fontes.tituloForte, fontSize: 25, color: cores.tapajos, letterSpacing: -0.6 },
})
