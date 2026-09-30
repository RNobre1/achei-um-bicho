import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Aviso } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { Campo } from '../../componentes/Campo'
import { GrupoDeChips } from '../../componentes/GrupoDeChips'
import { MapaArea } from '../../componentes/MapaArea'
import { Voltar } from '../../componentes/Voltar'
import {
  montarAvistamento,
  pendenciasDoAvistamento,
  type QuandoViu,
  type RascunhoAvistamento,
} from '../../dominio/avistamento'
import { nomeDoAnimal } from '../../dominio/mural'
import { api, ErroApi } from '../../servicos/api'
import { obterPosicao } from '../../servicos/localizacao'
import { cores, fontes } from '../../tema'

const QUANDO: Record<QuandoViu, string> = { agora: 'Agora há pouco', hoje_mais_cedo: 'Hoje mais cedo', ontem: 'Ontem' }
const OPCOES_QUANDO = (Object.keys(QUANDO) as QuandoViu[]).map((valor) => ({ valor, rotulo: QUANDO[valor] }))

export function RegistrarAvistamento() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const margens = useSafeAreaInsets()
  const [nome, setNome] = useState<string>()
  const [rascunho, setRascunho] = useState<RascunhoAvistamento>({ bairro: '', observacao: '' })
  const [procurando, setProcurando] = useState(false)
  const [semGps, setSemGps] = useState(false)
  const [pendencias, setPendencias] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string>()
  const [enviado, setEnviado] = useState(false)

  const mudar = (parte: Partial<RascunhoAvistamento>) => {
    setPendencias([])
    setRascunho((r) => ({ ...r, ...parte }))
  }

  async function localizar() {
    setProcurando(true)
    const posicao = await obterPosicao()
    setProcurando(false)
    setSemGps(posicao.aproximada)
    // o centro da cidade não é onde o bicho foi visto: sem GPS, fica sem ponto
    if (!posicao.aproximada) mudar({ ponto: posicao.ponto })
  }

  useEffect(() => {
    void localizar()
    api.abrirCaso(id).then(
      (caso) => setNome(nomeDoAnimal(caso.animal)),
      () => setNome(undefined),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function enviar() {
    const falta = pendenciasDoAvistamento(rascunho)
    if (falta.length > 0) {
      setPendencias(falta)
      return
    }
    setEnviando(true)
    setErro(undefined)
    try {
      await api.registrarAvistamento(id, montarAvistamento(rascunho))
      setEnviado(true)
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não deu para enviar o aviso. Tente de novo.')
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
        <Voltar rotulo="Caso" />
        {enviado ? (
          <View style={{ gap: 16 }}>
            <Text style={estilos.titulo}>Aviso enviado.</Text>
            <Text style={estilos.paragrafo}>
              Quem publicou o caso{nome ? ` de ${nome}` : ''} vê onde e quando você viu. Ninguém pediu seu nome nem seu
              telefone, e o ponto exato de onde você estava não aparece para ninguém.
            </Text>
            <Botao rotulo="Voltar para o caso" aoTocar={() => router.back()} />
          </View>
        ) : (
          <>
            <View style={{ gap: 6 }}>
              <Text style={estilos.rotulo}>{nome ? `AVISO SOBRE ${nome.toUpperCase()}` : 'AVISO DE AVISTAMENTO'}</Text>
              <Text style={estilos.titulo}>Onde você viu?</Text>
              <Text style={estilos.paragrafo}>Não precisa de conta. Quem publicou recebe o lugar e a hora.</Text>
            </View>

            <View style={{ gap: 7 }}>
              {rascunho.ponto ? <MapaArea centro={rascunho.ponto} raioM={100} altura={130} /> : null}
              {semGps ? (
                <Aviso
                  titulo="Não deu para pegar sua localização."
                  texto="Ative a localização do celular e tente de novo. O aviso precisa do lugar para ajudar."
                />
              ) : null}
              <Botao
                rotulo={rascunho.ponto ? 'Atualizar localização' : 'Usar minha localização'}
                variante="fraco"
                carregando={procurando}
                aoTocar={() => void localizar()}
              />
            </View>

            <GrupoDeChips rotulo="Quando" opcoes={OPCOES_QUANDO} marcado={rascunho.quando} aoEscolher={(quando) => mudar({ quando })} />
            <Campo rotulo="Bairro (opcional)" valor={rascunho.bairro} aoMudar={(bairro) => mudar({ bairro })} maxLength={80} />
            <Campo
              rotulo="O que você viu (opcional)"
              valor={rascunho.observacao}
              aoMudar={(observacao) => mudar({ observacao })}
              multiline
              maxLength={500}
              placeholder="Estava perto da padaria, parecia assustado…"
            />

            {pendencias.length > 0 ? <Aviso titulo="Falta pouco:" texto={pendencias.join('\n')} /> : null}
            {erro ? <Aviso titulo="Não deu para enviar." texto={erro} /> : null}
            <Botao rotulo="Enviar aviso" variante="acento" carregando={enviando} aoTocar={() => void enviar()} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.chuva },
  conteudo: { paddingHorizontal: 22, gap: 18 },
  rotulo: { fontFamily: fontes.dado, fontSize: 10.5, letterSpacing: 1.1, color: cores.apagado },
  titulo: { fontFamily: fontes.tituloForte, fontSize: 25, color: cores.tapajos, letterSpacing: -0.6 },
  paragrafo: { fontFamily: fontes.texto, fontSize: 14.5, lineHeight: 22, color: '#33474D' },
})
