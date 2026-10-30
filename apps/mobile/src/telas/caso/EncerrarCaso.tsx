import { TIPO_DESFECHO, opcoes, type TipoDesfecho } from '@achei/contratos'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Aviso } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { Campo } from '../../componentes/Campo'
import { GrupoDeChips } from '../../componentes/GrupoDeChips'
import { Voltar } from '../../componentes/Voltar'
import {
  montarDesfecho,
  pendenciasDoDesfecho,
  type QuandoDesfecho,
  type RascunhoDesfecho,
} from '../../dominio/ciclo-de-vida'
import { nomeDoAnimal } from '../../dominio/mural'
import { api, ErroApi } from '../../servicos/api'
import { meuCaso } from '../../servicos/meus-casos'
import { cores, fontes } from '../../tema'

const OPCOES_QUANDO: readonly { valor: QuandoDesfecho; rotulo: string }[] = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: 'ontem', rotulo: 'Ontem' },
  { valor: 'outro_dia', rotulo: 'Outro dia' },
]

export function EncerrarCaso() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const margens = useSafeAreaInsets()

  const [nome, setNome] = useState<string>()
  const [codigoEdicao, setCodigoEdicao] = useState<string>()
  const [carregando, setCarregando] = useState(true)

  const [rascunho, setRascunho] = useState<RascunhoDesfecho>({ quando: 'hoje' })
  const [pendencias, setPendencias] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string>()
  const [encerrado, setEncerrado] = useState(false)

  useEffect(() => {
    async function inicializar() {
      setCarregando(true)
      const guardado = await meuCaso(id)
      if (guardado) {
        setCodigoEdicao(guardado.codigoEdicao)
      }
      try {
        const caso = await api.abrirCaso(id)
        setNome(nomeDoAnimal(caso.animal))
      } catch {
        // caso pode já ter sido encerrado ou falhou rede
      } finally {
        setCarregando(false)
      }
    }
    void inicializar()
  }, [id])

  async function encerrar() {
    if (!codigoEdicao) {
      setErro('Código de edição do caso não encontrado neste aparelho.')
      return
    }

    const falta = pendenciasDoDesfecho(rascunho)
    if (falta.length > 0) {
      setPendencias(falta)
      return
    }

    setEnviando(true)
    setErro(undefined)
    try {
      await api.encerrarCaso(id, codigoEdicao, montarDesfecho(rascunho))
      setEncerrado(true)
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível encerrar o caso. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <KeyboardAvoidingView style={estilos.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[estilos.conteudo, { paddingTop: margens.top + 10, paddingBottom: margens.bottom + 32 }]}
      >
        <Voltar rotulo="Meus casos" />

        {carregando ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={cores.tapajos} />
        ) : encerrado ? (
          <View style={{ gap: 16 }}>
            <Text style={estilos.titulo}>Caso encerrado.</Text>
            <Text style={estilos.paragrafo}>
              O desfecho de {nome ?? 'animal'} foi registrado. O caso deixa de aparecer no mural ativo e suas pistas foram concluídas.
            </Text>
            <Botao rotulo="Voltar para Meus Casos" aoTocar={() => router.replace('/(abas)/meus-casos')} />
          </View>
        ) : (
          <View style={{ gap: 18 }}>
            <View style={{ gap: 6 }}>
              <Text style={estilos.rotulo}>ENCERRAR CASO</Text>
              <Text style={estilos.titulo}>{nome ? `Como terminou o caso de ${nome}?` : 'Como terminou o caso?'}</Text>
              <Text style={estilos.paragrafo}>
                Registrar o desfecho ajuda a manter o mural limpo e atualiza as estatísticas do projeto.
              </Text>
            </View>

            <GrupoDeChips
              rotulo="Como o caso terminou"
              opcoes={opcoes(TIPO_DESFECHO)}
              marcado={rascunho.tipo}
              aoEscolher={(tipo: TipoDesfecho) => {
                setPendencias([])
                setRascunho((r) => ({ ...r, tipo }))
              }}
            />

            <GrupoDeChips
              rotulo="Quando aconteceu"
              opcoes={OPCOES_QUANDO}
              marcado={rascunho.quando}
              aoEscolher={(quando: QuandoDesfecho) => {
                setPendencias([])
                setRascunho((r) => ({ ...r, quando }))
              }}
            />

            {rascunho.quando === 'outro_dia' ? (
              <Campo
                rotulo="Data do desfecho"
                valor={rascunho.dataOutroDia ?? ''}
                aoMudar={(dataOutroDia) => {
                  setPendencias([])
                  setRascunho((r) => ({ ...r, dataOutroDia }))
                }}
                placeholder="AAAA-MM-DD ou DD/MM/AAAA"
                dica="Informe a data aproximada em que o caso terminou."
              />
            ) : null}

            {pendencias.length > 0 ? (
              <Aviso titulo="Ajuste para continuar" texto={pendencias.join('\n')} />
            ) : null}

            {erro ? <Aviso titulo="Não deu para encerrar" texto={erro} /> : null}

            <Botao
              rotulo={enviando ? 'Encerrando...' : 'Confirmar encerramento'}
              aoTocar={encerrar}
              variante="primario"
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.chuva },
  conteudo: { paddingHorizontal: 22, gap: 18 },
  rotulo: { fontFamily: fontes.dado, fontSize: 11, letterSpacing: 1.2, color: cores.alter },
  titulo: { fontFamily: fontes.tituloForte, fontSize: 24, color: cores.tapajos, letterSpacing: -0.6 },
  paragrafo: { fontFamily: fontes.texto, fontSize: 14, lineHeight: 21, color: cores.texto },
})
