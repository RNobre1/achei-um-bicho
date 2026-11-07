import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Botao } from '../../componentes/Botao'
import { Etiqueta } from '../../componentes/Etiqueta'
import { Voltar } from '../../componentes/Voltar'
import {
  descreverEstadoItem,
  formatarHorarioFila,
  temItensPendentes,
  type ItemFilaEnvio,
} from '../../dominio/fila'
import { descartarItem, listarFila, processarFila, reenviarItem } from '../../servicos/fila-de-envio'
import { cores, fontes } from '../../tema'

export function FilaDeEnvio() {
  const router = useRouter()
  const margens = useSafeAreaInsets()
  const [itens, setItens] = useState<ItemFilaEnvio[]>()
  const [atualizando, setAtualizando] = useState(false)
  const [confirmandoDescarteId, setConfirmandoDescarteId] = useState<string>()

  const carregar = useCallback(async () => {
    setAtualizando(true)
    await processarFila()
    setItens(await listarFila())
    setAtualizando(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void carregar()
    }, [carregar]),
  )

  const reenviar = async (id: string) => {
    await reenviarItem(id)
    await carregar()
  }

  const descartar = async (id: string) => {
    await descartarItem(id)
    setConfirmandoDescarteId(undefined)
    await carregar()
  }

  const filaVazia = !itens || itens.length === 0 || !temItensPendentes(itens)

  return (
    <View style={[estilos.tela, { paddingTop: margens.top + 10 }]}>
      <View style={estilos.topo}>
        <Voltar rotulo="Voltar" />
      </View>

      <View style={estilos.cabecalho}>
        <Text style={estilos.titulo}>Fila de envio</Text>
        <Text style={estilos.subtitulo}>
          Casos guardados neste celular que sobem sozinhos quando a internet voltar.
        </Text>
      </View>

      {!itens ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={cores.tapajos} />
      ) : filaVazia ? (
        <View style={estilos.vazio}>
          <Text style={estilos.vazioTitulo}>Fila vazia</Text>
          <Text style={estilos.vazioTexto}>
            Nenhum caso esperando envio no momento. Quando você publicar sem sinal, ele aparece aqui.
          </Text>
          <Botao rotulo="Publicar um caso" aoTocar={() => router.push('/publicar')} />
        </View>
      ) : (
        <FlatList
          data={itens.filter((item) => item.estado !== 'enviado')}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => void carregar()} />}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => (
            <View style={estilos.item}>
              <View style={estilos.linhaTopo}>
                <Text style={estilos.nome}>{item.nomeAnimal}</Text>
                <Etiqueta tipo={item.tipo} />
              </View>
              <View style={estilos.linhaDetalhe}>
                <Text
                  style={[
                    estilos.estado,
                    item.estado === 'enviado' && estilos.estadoPublicado,
                    item.estado === 'falhou' && estilos.estadoFalhou,
                  ]}
                >
                  {descreverEstadoItem(item)}
                </Text>
                <Text style={estilos.horario}>{formatarHorarioFila(item.criadoEm)}</Text>
              </View>
              {item.fotos.length > 0 ? (
                <Text style={estilos.fotosTexto}>
                  {item.fotos.filter((f) => f.estado === 'enviado').length} de {item.fotos.length} fotos enviadas
                </Text>
              ) : null}
              {item.estado === 'falhou' ? (
                <View style={estilos.acoesFalha}>
                  <Botao
                    rotulo="Tentar enviar de novo"
                    variante="fraco"
                    aoTocar={() => void reenviar(item.id)}
                  />
                  {confirmandoDescarteId === item.id ? (
                    <View style={estilos.confirmacaoDescarte}>
                      <Text style={estilos.confirmacaoTexto}>Descartar este caso da fila?</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Botao
                            rotulo="Sim, descartar"
                            variante="escuro"
                            aoTocar={() => void descartar(item.id)}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Botao
                            rotulo="Cancelar"
                            variante="fraco"
                            aoTocar={() => setConfirmandoDescarteId(undefined)}
                          />
                        </View>
                      </View>
                    </View>
                  ) : (
                    <Botao
                      rotulo="Descartar"
                      variante="fraco"
                      aoTocar={() => setConfirmandoDescarteId(item.id)}
                    />
                  )}
                </View>
              ) : null}
            </View>
          )}
          ItemSeparatorComponent={() => <View style={estilos.divisa} />}
        />
      )}
    </View>
  )
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.chuva },
  topo: { paddingHorizontal: 22, paddingBottom: 8 },
  cabecalho: { paddingHorizontal: 22, paddingBottom: 16 },
  titulo: { fontFamily: fontes.tituloForte, fontSize: 28, color: cores.tapajos, letterSpacing: -0.8 },
  subtitulo: { fontFamily: fontes.texto, fontSize: 13, color: cores.apagado, marginTop: 4 },
  vazio: { paddingHorizontal: 26, paddingTop: 40, gap: 14 },
  vazioTitulo: { fontFamily: fontes.titulo, fontSize: 21, color: cores.tapajos, letterSpacing: -0.5 },
  vazioTexto: { fontFamily: fontes.texto, fontSize: 14.5, lineHeight: 22, color: cores.apagado },
  item: { paddingHorizontal: 22, paddingVertical: 16, gap: 8 },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nome: { fontFamily: fontes.titulo, fontSize: 17, color: cores.tapajos },
  linhaDetalhe: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  estado: { fontFamily: fontes.textoMedio, fontSize: 13, color: cores.apagado },
  estadoPublicado: { color: cores.achei },
  estadoFalhou: { color: cores.perdi },
  horario: { fontFamily: fontes.dado, fontSize: 11, color: cores.apagado },
  fotosTexto: { fontFamily: fontes.dado, fontSize: 11, color: cores.apagado },
  acoesFalha: { gap: 8, marginTop: 4 },
  confirmacaoDescarte: {
    backgroundColor: cores.branco,
    borderWidth: 1,
    borderColor: cores.traco,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  confirmacaoTexto: { fontFamily: fontes.texto, fontSize: 13, color: cores.tapajos },
  divisa: { height: 1, backgroundColor: cores.traco },
})
