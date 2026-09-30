import { RAIO, TIPO_CASO, type Mural, type TipoCaso } from '@achei/contratos'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Botao } from '../../componentes/Botao'
import { formatarDistancia } from '../../dominio/formatar'
import { proximoRaio } from '../../dominio/mural'
import { api, ErroApi } from '../../servicos/api'
import type { Posicao } from '../../dominio/posicao'
import { obterPosicao } from '../../servicos/localizacao'
import { cores, fontes } from '../../tema'
import { CardCaso } from './CardCaso'

type Filtro = TipoCaso | 'tudo'

// o plural do filtro é texto de tela, mas as chaves vêm do vocabulário: um tipo de
// caso novo obriga a escrever o rótulo dele aqui
const ROTULO_FILTRO: Record<Filtro, string> = { tudo: 'Tudo', perdido: 'Sumiram', encontrado: 'Foram achados' }
const FILTROS: Filtro[] = ['tudo', ...TIPO_CASO.valores]

export function CasosPerto() {
  const router = useRouter()
  const margens = useSafeAreaInsets()
  const [posicao, setPosicao] = useState<Posicao>()
  const [raio, setRaio] = useState<number>(RAIO.padraoM)
  const [filtro, setFiltro] = useState<Filtro>('tudo')
  const [mural, setMural] = useState<Mural>()
  const [erro, setErro] = useState<string>()
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    void obterPosicao().then(setPosicao)
  }, [])

  const carregar = useCallback(async () => {
    if (!posicao) return
    setCarregando(true)
    setErro(undefined)
    try {
      setMural(
        await api.mural({
          ...posicao.ponto,
          raio,
          tipo: filtro === 'tudo' ? undefined : filtro,
        }),
      )
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não deu para carregar os casos.')
    } finally {
      setCarregando(false)
    }
  }, [posicao, raio, filtro])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const casos = mural?.casos ?? []
  const lugar = !posicao
    ? 'Santarém · procurando onde você está'
    : posicao.aproximada
      ? 'Santarém · a partir do centro da cidade'
      : 'Santarém · perto de você'

  return (
    <View style={[estilos.tela, { paddingTop: margens.top + 12 }]}>
      <View style={estilos.cabecalho}>
        <Text style={estilos.marca}>Achei um bicho</Text>
        <Text style={estilos.lugar}>{lugar}</Text>
      </View>

      <View style={estilos.alcance}>
        <Text style={estilos.alcanceTexto}>
          Mostrando <Text style={estilos.alcanceRaio}>{formatarDistancia(raio)}</Text>{' '}
          {posicao?.aproximada ? 'em volta do centro' : 'em volta de você'}
        </Text>
        <Pressable onPress={() => setRaio(proximoRaio(raio))} accessibilityRole="button">
          <Text style={estilos.alcanceAcao}>{raio === RAIO.maximoM ? 'Reduzir' : 'Aumentar'}</Text>
        </Pressable>
      </View>

      <View style={estilos.filtros}>
        {FILTROS.map((opcao, i) => (
          <Pressable
            key={opcao}
            onPress={() => setFiltro(opcao)}
            accessibilityRole="button"
            accessibilityState={{ selected: filtro === opcao }}
            style={[estilos.filtro, i > 0 && estilos.filtroDivisa, filtro === opcao && estilos.filtroAtivo]}
          >
            <Text style={[estilos.filtroTexto, filtro === opcao && estilos.filtroTextoAtivo]}>
              {ROTULO_FILTRO[opcao]}
            </Text>
          </Pressable>
        ))}
      </View>

      {erro ? (
        <View style={estilos.estado}>
          <Text style={estilos.estadoTitulo}>Não deu para carregar</Text>
          <Text style={estilos.estadoTexto}>{erro}</Text>
          <Botao rotulo="Tentar de novo" aoTocar={() => void carregar()} />
        </View>
      ) : !mural && carregando ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={cores.tapajos} />
      ) : (
        <FlatList
          data={casos}
          keyExtractor={(caso) => caso.id}
          ListHeaderComponent={
            casos.length > 0 ? (
              <Text style={estilos.contagem}>
                {casos.length === 1 ? '1 CASO POR PERTO' : `${casos.length} CASOS POR PERTO`}
              </Text>
            ) : null
          }
          renderItem={({ item }) => <CardCaso caso={item} aoTocar={() => router.push(`/caso/${item.id}`)} />}
          ItemSeparatorComponent={() => <View style={estilos.divisa} />}
          refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => void carregar()} />}
          ListEmptyComponent={
            <View style={estilos.estado}>
              <Text style={estilos.estadoTitulo}>Nenhum caso aberto neste raio agora</Text>
              {mural && mural.totalNoRaioMaximo > 0 && raio < RAIO.maximoM ? (
                <>
                  <Text style={estilos.estadoTexto}>
                    É uma boa notícia. Se aumentar para {formatarDistancia(RAIO.maximoM)} aparecem{' '}
                    {mural.totalNoRaioMaximo === 1 ? '1 caso' : `${mural.totalNoRaioMaximo} casos`}.
                  </Text>
                  <Botao
                    rotulo={`Ver casos até ${formatarDistancia(RAIO.maximoM)}`}
                    aoTocar={() => setRaio(RAIO.maximoM)}
                  />
                </>
              ) : (
                <Text style={estilos.estadoTexto}>
                  É uma boa notícia. Se você achar ou perder um bicho, publique: o aviso chega a quem mora perto.
                </Text>
              )}
            </View>
          }
        />
      )}
    </View>
  )
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.chuva },
  cabecalho: { paddingHorizontal: 22 },
  marca: { fontFamily: fontes.tituloForte, fontSize: 25, color: cores.tapajos, letterSpacing: -0.8 },
  lugar: { fontFamily: fontes.texto, fontSize: 12.5, color: cores.apagado, marginTop: 2 },
  alcance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 22,
    marginTop: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: cores.traco,
    backgroundColor: cores.branco,
  },
  alcanceTexto: { fontFamily: fontes.dado, fontSize: 11, color: cores.texto },
  alcanceRaio: { color: cores.perdi, fontFamily: fontes.dadoMedio },
  alcanceAcao: {
    fontFamily: fontes.textoForte,
    fontSize: 12.5,
    color: cores.perdi,
    borderBottomWidth: 1.5,
    borderBottomColor: cores.perdi,
  },
  filtros: { flexDirection: 'row', marginHorizontal: 22, marginTop: 11, borderWidth: 1, borderColor: cores.traco },
  filtro: { flex: 1, paddingVertical: 11, alignItems: 'center', backgroundColor: cores.branco },
  filtroDivisa: { borderLeftWidth: 1, borderLeftColor: cores.traco },
  filtroAtivo: { backgroundColor: cores.tapajos },
  filtroTexto: { fontFamily: fontes.textoForte, fontSize: 13, color: cores.apagado },
  filtroTextoAtivo: { color: cores.branco },
  contagem: {
    fontFamily: fontes.dado,
    fontSize: 10.5,
    letterSpacing: 0.8,
    color: cores.apagado,
    paddingHorizontal: 22,
    paddingTop: 13,
    paddingBottom: 7,
  },
  divisa: { height: 1, backgroundColor: cores.traco },
  estado: { paddingHorizontal: 26, paddingTop: 48, gap: 14 },
  estadoTitulo: { fontFamily: fontes.titulo, fontSize: 21, color: cores.tapajos, letterSpacing: -0.5 },
  estadoTexto: { fontFamily: fontes.texto, fontSize: 14, lineHeight: 21, color: cores.apagado },
})
