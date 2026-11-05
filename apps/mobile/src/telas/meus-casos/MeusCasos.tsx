import { ESTADO_CASO, type CasoAberto, type SituacaoDoCaso } from '@achei/contratos'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Aviso } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { Etiqueta } from '../../componentes/Etiqueta'
import { LinhaMarcada } from '../../componentes/LinhaMarcada'
import { Placa } from '../../componentes/Placa'
import { acoesDisponiveis, textoDaSituacao } from '../../dominio/ciclo-de-vida'
import { formatarTempoDesde } from '../../dominio/formatar'
import { rotuloCurtoReivindicacao } from '../../dominio/reivindicacao'
import type { MeuCaso } from '../../dominio/meus-casos'
import type { MinhaReivindicacao } from '../../dominio/minhas-reivindicacoes'
import { resumoDoMeuCaso } from '../../dominio/pistas'
import { api } from '../../servicos/api'
import { listarMeusCasos } from '../../servicos/meus-casos'
import { listarMinhasReivindicacoes } from '../../servicos/minhas-reivindicacoes'
import { cores, fontes } from '../../tema'

interface Situacao {
  meu: MeuCaso
  caso?: CasoAberto
  situacao?: SituacaoDoCaso
  avisos: number
  pistas: number
}

/** Lê o que der de cada caso; um caso que falhar não esconde os outros. */
async function situacaoDe(meu: MeuCaso): Promise<Situacao> {
  const [caso, situacao, avisos, pistas] = await Promise.all([
    api.abrirCaso(meu.id).catch(() => undefined),
    api.situacaoDoCaso(meu.id, meu.codigoEdicao).catch(() => undefined),
    api.avistamentosDoMeuCaso(meu.id, meu.codigoEdicao).then((a) => a.length, () => 0),
    api.pistasDoMeuCaso(meu.id, meu.codigoEdicao).then((p) => p.length, () => 0),
  ])
  return { meu, caso, situacao, avisos, pistas }
}

export function MeusCasos() {
  const router = useRouter()
  const margens = useSafeAreaInsets()
  const [situacoes, setSituacoes] = useState<Situacao[]>()
  const [minhasReivindicacoes, setMinhasReivindicacoes] = useState<MinhaReivindicacao[]>()

  const carregar = useCallback(async () => {
    const [meus, reivs] = await Promise.all([listarMeusCasos(), listarMinhasReivindicacoes()])
    setMinhasReivindicacoes(reivs)
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

      {minhasReivindicacoes && minhasReivindicacoes.length > 0 ? (
        <View style={estilos.blocoReivindicacoes}>
          <Text style={[estilos.rotuloSecao, estilos.margem]}>REIVINDICAÇÕES QUE FIZ</Text>
          {minhasReivindicacoes.map((r) => (
            <Pressable
              key={r.id}
              style={estilos.itemReivindicacao}
              onPress={() => router.push(`/reivindicacao/${r.id}`)}
              accessibilityRole="button"
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={estilos.nomeReivindicacao}>
                  {r.nomeAnimal ? `${r.nomeAnimal} · ` : ''}
                  {rotuloCurtoReivindicacao(r.tipoCaso)}
                </Text>
                <Text style={estilos.dataReivindicacao}>Enviada {formatarTempoDesde(r.criadoEm)}</Text>
              </View>
              <Text style={estilos.setaReivindicacao}>Ver situação ›</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

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
        situacoes.map(({ meu, caso, situacao, avisos, pistas }) => {
          const estadoAtual = situacao?.estado ?? caso?.estado ?? 'procurando'
          const acoes = acoesDisponiveis({ estado: estadoAtual, cobrancaPendente: situacao?.cobrancaPendente })

          return (
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
                    {situacao
                      ? `${textoDaSituacao(situacao)} · `
                      : caso
                        ? `${ESTADO_CASO.entradas[caso.estado].rotulo} · `
                        : ''}
                    publicado {formatarTempoDesde(meu.publicadoEm)}
                  </Text>
                </View>
                <Etiqueta tipo={meu.tipo} />
              </View>

              {acoes.includes('confirmar') ? (
                <View style={estilos.blocoCobranca}>
                  <Aviso
                    titulo="Ainda está procurando?"
                    texto="Casos sem confirmação recente saem do mural para manter os anúncios atualizados."
                  />
                  <Botao
                    rotulo="Sim, ainda procuro"
                    aoTocar={async () => {
                      await api.confirmarCaso(meu.id, meu.codigoEdicao)
                      void carregar()
                    }}
                  />
                </View>
              ) : null}

              {resumoDoMeuCaso(meu.tipo, avisos, pistas).map((linha, i) => (
                <LinhaMarcada key={i} bate {...linha} />
              ))}

              {acoes.includes('reabrir') ? (
                <Botao
                  rotulo="O contato não deu certo"
                  variante="fraco"
                  aoTocar={async () => {
                    await api.reabrirCaso(meu.id, meu.codigoEdicao)
                    void carregar()
                  }}
                />
              ) : null}

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

              {acoes.includes('editar') && acoes.includes('encerrar') ? (
                <View style={estilos.dupla}>
                  <View style={{ flex: 1 }}>
                    <Botao
                      rotulo="Editar"
                      variante="fraco"
                      aoTocar={() => router.push(`/caso/${meu.id}/editar`)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Botao
                      rotulo="Encerrar caso"
                      variante="fraco"
                      aoTocar={() => router.push(`/caso/${meu.id}/encerrar`)}
                    />
                  </View>
                </View>
              ) : acoes.includes('encerrar') ? (
                <Botao
                  rotulo="Encerrar caso"
                  variante="fraco"
                  aoTocar={() => router.push(`/caso/${meu.id}/encerrar`)}
                />
              ) : null}
            </View>
          )
        })
      )}
      <Pressable onPress={() => router.push('/fila')} style={{ alignItems: 'center', marginTop: 22 }}><Text style={{ fontFamily: fontes.dado, fontSize: 11, color: cores.apagado }}>Fila de envio sem conexão</Text></Pressable>
    </ScrollView>
  )
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.chuva },
  margem: { paddingHorizontal: 22 },
  titulo: { fontFamily: fontes.tituloForte, fontSize: 28, color: cores.tapajos, letterSpacing: -0.8 },
  nota: { fontFamily: fontes.texto, fontSize: 13, color: cores.apagado, marginTop: 4, marginBottom: 8 },
  blocoReivindicacoes: { marginTop: 12, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: cores.traco, paddingBottom: 12 },
  rotuloSecao: { fontFamily: fontes.dadoMedio, fontSize: 10, letterSpacing: 1.1, color: cores.perdi, marginBottom: 8 },
  itemReivindicacao: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: cores.branco,
    borderTopWidth: 1,
    borderTopColor: cores.traco,
  },
  nomeReivindicacao: { fontFamily: fontes.textoForte, fontSize: 14, color: cores.tapajos },
  dataReivindicacao: { fontFamily: fontes.dado, fontSize: 11, color: cores.apagado },
  setaReivindicacao: { fontFamily: fontes.textoMedio, fontSize: 13, color: cores.alter },
  meu: { paddingHorizontal: 22, paddingVertical: 18, gap: 12, borderTopWidth: 1, borderTopColor: cores.traco },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  foto: { width: 56, height: 56 },
  identidade: { flex: 1, gap: 3 },
  nome: { fontFamily: fontes.titulo, fontSize: 18, color: cores.tapajos },
  estado: { fontFamily: fontes.dado, fontSize: 11, color: cores.apagado },
  dupla: { flexDirection: 'row', gap: 10 },
  blocoCobranca: { gap: 8 },
  estadoTitulo: { fontFamily: fontes.titulo, fontSize: 21, color: cores.tapajos, letterSpacing: -0.5 },
  paragrafo: { fontFamily: fontes.texto, fontSize: 14.5, lineHeight: 22, color: cores.apagado },
})
