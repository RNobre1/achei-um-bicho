import type { Pista } from '@achei/contratos'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Botao } from '../../componentes/Botao'
import type { MeuCaso } from '../../dominio/meus-casos'
import { resumoDasPistas } from '../../dominio/pistas'
import { api, ErroApi } from '../../servicos/api'
import { listarMeusCasos } from '../../servicos/meus-casos'
import { cores, fontes } from '../../tema'
import { CardDaPista } from './CardDaPista'

interface Grupo {
  caso: MeuCaso
  pistas: Pista[]
  /** Primeira foto do próprio caso, para o par aparecer lado a lado. */
  minhaFoto?: string
}

export function Pistas() {
  const router = useRouter()
  const margens = useSafeAreaInsets()
  const [grupos, setGrupos] = useState<Grupo[]>()
  const [semCasos, setSemCasos] = useState(false)
  const [erro, setErro] = useState<string>()
  const [descartando, setDescartando] = useState<string>()

  const carregar = useCallback(async () => {
    setErro(undefined)
    const meus = await listarMeusCasos()
    setSemCasos(meus.length === 0)
    try {
      const lidos = await Promise.all(
        meus.map(async (caso) => {
          // a foto do próprio caso é enfeite: se não vier, o card fica com a placa
          const [pistas, aberto] = await Promise.all([
            api.pistasDoMeuCaso(caso.id, caso.codigoEdicao),
            api.abrirCaso(caso.id).catch(() => undefined),
          ])
          return { caso, pistas, minhaFoto: aberto?.fotos[0] }
        }),
      )
      setGrupos(lidos.filter((grupo) => grupo.pistas.length > 0))
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não deu para carregar as pistas.')
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void carregar()
    }, [carregar]),
  )

  async function descartar(grupo: Grupo, pista: Pista) {
    setDescartando(pista.id)
    try {
      await api.descartarPista(grupo.caso.id, pista.id, grupo.caso.codigoEdicao)
      setGrupos((atuais) =>
        atuais
          ?.map((g) => (g.caso.id === grupo.caso.id ? { ...g, pistas: g.pistas.filter((p) => p.id !== pista.id) } : g))
          .filter((g) => g.pistas.length > 0),
      )
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não deu para registrar a decisão.')
    } finally {
      setDescartando(undefined)
    }
  }

  const total = grupos?.reduce((soma, g) => soma + g.pistas.length, 0) ?? 0
  const rotulo = grupos?.length === 1 ? `${grupos[0]!.caso.nome} · seu caso` : 'Seus casos'

  return (
    <ScrollView style={estilos.tela} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={[estilos.partido, { paddingTop: margens.top + 26 }]}>
        <View style={estilos.partidoB} />
        <Text style={estilos.partidoRotulo}>{rotulo.toUpperCase()}</Text>
        <View style={estilos.partidoTitulo}>
          <Text style={estilos.titulo}>Pode ser o mesmo bicho</Text>
        </View>
      </View>

      {erro ? (
        <View style={estilos.estado}>
          <Text style={estilos.paragrafo}>{erro}</Text>
          <Botao rotulo="Tentar de novo" aoTocar={() => void carregar()} />
        </View>
      ) : semCasos ? (
        <View style={estilos.estado}>
          <Text style={estilos.estadoTitulo}>Nenhum caso publicado neste celular</Text>
          <Text style={estilos.paragrafo}>
            Quando você publicar um caso, o aplicativo procura do outro lado quem pode ser o mesmo bicho e mostra aqui.
          </Text>
          <Botao rotulo="Publicar um caso" aoTocar={() => router.push('/publicar')} />
        </View>
      ) : !grupos ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={cores.tapajos} />
      ) : total === 0 ? (
        <View style={estilos.estado}>
          <Text style={estilos.estadoTitulo}>Nenhuma pista por enquanto</Text>
          <Text style={estilos.paragrafo}>
            Nenhum caso do outro lado bate com o que você publicou. A cada caso novo publicado perto, o aplicativo
            compara de novo.
          </Text>
        </View>
      ) : (
        <>
          <Text style={[estilos.paragrafo, estilos.resumo]}>{resumoDasPistas(total)}</Text>
          {grupos.map((grupo) => (
            <View key={grupo.caso.id}>
              {grupos.length > 1 ? <Text style={estilos.grupo}>{grupo.caso.nome.toUpperCase()} · SEU CASO</Text> : null}
              {grupo.pistas.map((pista) => (
                <CardDaPista
                  key={pista.id}
                  pista={pista}
                  meuTipo={grupo.caso.tipo}
                  meuNome={grupo.caso.nome}
                  minhaFoto={grupo.minhaFoto}
                  descartando={descartando === pista.id}
                  aoAbrir={() => router.push(`/caso/${pista.outro.id}`)}
                  aoDescartar={() => void descartar(grupo, pista)}
                />
              ))}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  )
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.chuva },
  partido: { backgroundColor: cores.tapajos, paddingHorizontal: 22, paddingBottom: 0, overflow: 'hidden' },
  partidoB: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '58%', backgroundColor: cores.silte },
  partidoRotulo: { fontFamily: fontes.dado, fontSize: 11, letterSpacing: 1.6, color: '#C9D6D8' },
  partidoTitulo: { alignSelf: 'flex-start', backgroundColor: cores.tapajos, paddingHorizontal: 12, paddingVertical: 8, marginTop: 40, marginLeft: 10 },
  titulo: { fontFamily: fontes.tituloForte, fontSize: 25, color: cores.branco, letterSpacing: -0.7 },
  resumo: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 4 },
  paragrafo: { fontFamily: fontes.texto, fontSize: 14.5, lineHeight: 22, color: cores.apagado },
  grupo: { fontFamily: fontes.dadoMedio, fontSize: 10.5, letterSpacing: 1.1, color: cores.perdi, paddingHorizontal: 22, paddingTop: 20 },
  estado: { paddingHorizontal: 26, paddingTop: 32, gap: 14 },
  estadoTitulo: { fontFamily: fontes.titulo, fontSize: 21, color: cores.tapajos, letterSpacing: -0.5 },
})
