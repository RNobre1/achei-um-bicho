import { ESTADO_CASO, type CasoAberto } from '@achei/contratos'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Botao } from '../../componentes/Botao'
import { Etiqueta } from '../../componentes/Etiqueta'
import { LinhaMarcada } from '../../componentes/LinhaMarcada'
import { Placa } from '../../componentes/Placa'
import { formatarTempoDesde } from '../../dominio/formatar'
import type { MeuCaso } from '../../dominio/meus-casos'
import { resumoDoMeuCaso } from '../../dominio/pistas'
import { api } from '../../servicos/api'
import { listarMeusCasos } from '../../servicos/meus-casos'
import { cores, fontes } from '../../tema'

interface Situacao {
  meu: MeuCaso
  caso?: CasoAberto
  avisos: number
  pistas: number
}

/** Lê o que der de cada caso; um caso que falhar não esconde os outros. */
async function situacaoDe(meu: MeuCaso): Promise<Situacao> {
  const [caso, avisos, pistas] = await Promise.all([
    api.abrirCaso(meu.id).catch(() => undefined),
    api.avistamentosDoMeuCaso(meu.id, meu.codigoEdicao).then((a) => a.length, () => 0),
    api.pistasDoMeuCaso(meu.id, meu.codigoEdicao).then((p) => p.length, () => 0),
  ])
  return { meu, caso, avisos, pistas }
}

export function MeusCasos() {
  const router = useRouter()
  const margens = useSafeAreaInsets()
  const [situacoes, setSituacoes] = useState<Situacao[]>()

  const carregar = useCallback(async () => {
    const meus = await listarMeusCasos()
    setSituacoes(await Promise.all(meus.map(situacaoDe)))
  }, [])

  useFocusEffect(
    useCallback(() => {
      void carregar()
    }, [carregar]),
  )

  return (
    <ScrollView style={estilos.tela} contentContainerStyle={{ paddingTop: margens.top + 16, paddingBottom: 32 }}>
      <Text style={[estilos.titulo, estilos.margem]}>Meus casos</Text>
      <Text style={[estilos.nota, estilos.margem]}>Os casos publicados neste celular, com quem viu e as pistas.</Text>

      {!situacoes ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={cores.tapajos} />
      ) : situacoes.length === 0 ? (
        <View style={[estilos.margem, { gap: 14, paddingTop: 28 }]}>
          <Text style={estilos.estadoTitulo}>Nenhum caso por aqui ainda</Text>
          <Text style={estilos.paragrafo}>
            Quem publica sem conta continua dono do caso pelo código de edição, que fica guardado neste celular.
          </Text>
          <Botao rotulo="Publicar um caso" aoTocar={() => router.push('/publicar')} />
        </View>
      ) : (
        situacoes.map(({ meu, caso, avisos, pistas }) => (
          <View key={meu.id} style={estilos.meu}>
            <View style={estilos.topo}>
              {caso?.fotos[0] ? (
                <Image source={{ uri: api.urlDaFoto(caso.fotos[0]) }} style={estilos.foto} />
              ) : (
                <Placa silte={meu.tipo === 'encontrado'} estilo={estilos.foto} />
              )}
              <View style={estilos.identidade}>
                <Text style={estilos.nome}>{meu.nome}</Text>
                <Text style={estilos.estado}>
                  {caso ? `${ESTADO_CASO.entradas[caso.estado].rotulo} · ` : ''}publicado {formatarTempoDesde(meu.publicadoEm)}
                </Text>
              </View>
              <Etiqueta tipo={meu.tipo} />
            </View>
            {resumoDoMeuCaso(meu.tipo, avisos, pistas).map((linha, i) => (
              <LinhaMarcada key={i} bate {...linha} />
            ))}
            <View style={estilos.dupla}>
              <View style={{ flex: 1 }}>
                <Botao rotulo="Ver o caso" variante={avisos > 0 ? 'acento' : 'fraco'} aoTocar={() => router.push(`/caso/${meu.id}`)} />
              </View>
              {pistas > 0 ? (
                <View style={{ flex: 1 }}>
                  <Botao rotulo="Ver pistas" variante="fraco" aoTocar={() => router.push('/pistas')} />
                </View>
              ) : null}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  )
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.chuva },
  margem: { paddingHorizontal: 22 },
  titulo: { fontFamily: fontes.tituloForte, fontSize: 28, color: cores.tapajos, letterSpacing: -0.8 },
  nota: { fontFamily: fontes.texto, fontSize: 13, color: cores.apagado, marginTop: 4, marginBottom: 8 },
  meu: { paddingHorizontal: 22, paddingVertical: 18, gap: 12, borderTopWidth: 1, borderTopColor: cores.traco },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  foto: { width: 56, height: 56 },
  identidade: { flex: 1, gap: 3 },
  nome: { fontFamily: fontes.titulo, fontSize: 18, color: cores.tapajos },
  estado: { fontFamily: fontes.dado, fontSize: 11, color: cores.apagado },
  dupla: { flexDirection: 'row', gap: 10 },
  estadoTitulo: { fontFamily: fontes.titulo, fontSize: 21, color: cores.tapajos, letterSpacing: -0.5 },
  paragrafo: { fontFamily: fontes.texto, fontSize: 14.5, lineHeight: 22, color: cores.apagado },
})
