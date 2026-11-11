import type { AvistamentoParaAutor, CasoAberto as Caso } from '@achei/contratos'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Image, Linking, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Aviso } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { Etiqueta } from '../../componentes/Etiqueta'
import { MapaArea } from '../../componentes/MapaArea'
import { Placa } from '../../componentes/Placa'
import { Voltar } from '../../componentes/Voltar'
import { decidirCacheCaso } from '../../dominio/cache-offline'
import { atributosDoCaso, descreverQuando, fraseDoLocal, TITULO_DO_LOCAL } from '../../dominio/caso-aberto'
import { formatarTempoDesde } from '../../dominio/formatar'
import { enderecoNoGoogleMaps } from '../../dominio/mapa'
import type { MeuCaso } from '../../dominio/meus-casos'
import { nomeDoAnimal } from '../../dominio/mural'
import { rotuloBotaoReivindicar } from '../../dominio/reivindicacao'
import { api, ErroApi, statusDoErro } from '../../servicos/api'
import { meuCaso } from '../../servicos/meus-casos'
import { obterCasoDoCache, salvarCasoNoCache } from '../../servicos/cache-offline'
import { cores, fontes } from '../../tema'
import { AvisosDoAutor } from './AvisosDoAutor'
import { ReivindicacoesDoAutor } from './ReivindicacoesDoAutor'

export function CasoAberto() {
  const { id, casoProprio } = useLocalSearchParams<{ id: string; casoProprio?: string }>()
  const router = useRouter()
  const margens = useSafeAreaInsets()
  const { width: larguraDaTela } = useWindowDimensions()
  const [caso, setCaso] = useState<Caso>()
  const [erro, setErro] = useState<string>()
  const [meu, setMeu] = useState<MeuCaso>()
  const [avisos, setAvisos] = useState<AvistamentoParaAutor[]>()
  const [erroAvisos, setErroAvisos] = useState<string>()
  const [avisoOffline, setAvisoOffline] = useState<string>()

  const carregar = useCallback(async () => {
    setErro(undefined)
    try {
      const resultado = await api.abrirCaso(id)
      setCaso(resultado)
      setAvisoOffline(undefined)
      void salvarCasoNoCache(resultado)
    } catch (e) {
      const status = statusDoErro(e)
      const mensagem = e instanceof ErroApi ? e.message : 'Não deu para abrir o caso.'
      const cache = await obterCasoDoCache(id)
      const decisao = decidirCacheCaso({ status, mensagem }, id, cache)
      if (decisao.usarCache) {
        setCaso(decisao.caso)
        setAvisoOffline(decisao.aviso)
      } else {
        setErro(decisao.erro)
      }
    }
  }, [id])

  const carregarAvisos = useCallback(async () => {
    // o código de edição guardado na publicação é o que prova que o caso é deste aparelho
    const casoSalvo = await meuCaso(id)
    setMeu(casoSalvo)
    if (!casoSalvo) return
    try {
      setAvisos(await api.avistamentosDoMeuCaso(id, casoSalvo.codigoEdicao))
    } catch (e) {
      setErroAvisos(e instanceof ErroApi ? e.message : 'Não deu para carregar os avisos.')
    }
  }, [id])

  useEffect(() => {
    void carregar()
    void carregarAvisos()
  }, [carregar, carregarAvisos])

  return (
    <View style={[estilos.tela, { paddingTop: margens.top + 10 }]}>
      <View style={estilos.topo}>
        <Voltar rotulo="Casos perto" />
      </View>

      {erro ? (
        <View style={estilos.estado}>
          <Text style={estilos.titulo}>Não deu para abrir</Text>
          <Text style={estilos.paragrafo}>{erro}</Text>
          <Botao rotulo="Tentar de novo" aoTocar={() => void carregar()} />
        </View>
      ) : !caso ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={cores.tapajos} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: margens.bottom + 24 }}>
          {avisoOffline ? (
            <View style={{ paddingHorizontal: 22, paddingBottom: 10 }}>
              <Aviso texto={avisoOffline} />
            </View>
          ) : null}
          <View>
            {caso.fotos.length > 0 ? (
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                {caso.fotos.map((caminho, i) => (
                  <Image
                    key={caminho}
                    source={{ uri: api.urlDaFoto(caminho) }}
                    style={[estilos.foto, { width: larguraDaTela }]}
                    accessibilityLabel={`Foto ${i + 1} de ${caso.fotos.length}`}
                  />
                ))}
              </ScrollView>
            ) : (
              <Placa rotulo="sem foto" silte={caso.tipo === 'encontrado'} estilo={estilos.foto} />
            )}
            {caso.area.bairro ? <Text style={estilos.carimbo}>{caso.area.bairro.toUpperCase()} · PA</Text> : null}
          </View>

          <View style={estilos.bloco}>
            <View style={estilos.linhaTopo}>
              <Etiqueta tipo={caso.tipo} />
              <Text style={estilos.quando}>{formatarTempoDesde(caso.publicadoEm)}</Text>
            </View>
            <Text style={estilos.titulo}>{nomeDoAnimal(caso.animal)}</Text>
            {caso.relato ? <Text style={estilos.paragrafo}>{caso.relato}</Text> : null}
          </View>

          <View style={[estilos.bloco, estilos.divisa]}>
            <View style={estilos.atributos}>
              {atributosDoCaso(caso.animal).map((atributo) => (
                <View key={atributo.rotulo} style={estilos.atributo}>
                  <Text style={estilos.rotulo}>{atributo.rotulo.toUpperCase()}</Text>
                  <Text style={estilos.valor}>{atributo.valor}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={estilos.bloco}>
            <Text style={estilos.rotulo}>{TITULO_DO_LOCAL[caso.tipo].toUpperCase()}</Text>
            <MapaArea
              centro={caso.area}
              raioM={caso.area.raioM}
              aoTocar={() => void Linking.openURL(enderecoNoGoogleMaps(caso.area, caso.area.raioM))}
            />
            <Text style={[estilos.paragrafo, estilos.pequeno]}>
              {descreverQuando(caso.ocorridoEm)}. {fraseDoLocal(caso.area.bairro)}
            </Text>
          </View>

          {meu ? (
            <View style={[estilos.bloco, estilos.divisa, estilos.acoes]}>
              <AvisosDoAutor tipo={caso.tipo} avisos={avisos} erro={erroAvisos} />
              <ReivindicacoesDoAutor
                casoId={caso.id}
                codigoEdicao={meu.codigoEdicao}
                tipo={caso.tipo}
                estadoCaso={caso.estado}
                aoDecidir={() => void carregar()}
              />
            </View>
          ) : (
            <View style={[estilos.bloco, estilos.divisa, estilos.acoes]}>
              <Botao
                rotulo="Vi esse bicho na rua"
                variante="acento"
                aoTocar={() => router.push(`/caso/${caso.id}/avistamento`)}
              />
              <Botao
                rotulo={rotuloBotaoReivindicar(caso.tipo)}
                variante="fraco"
                aoTocar={() =>
                  router.push(
                    casoProprio
                      ? `/caso/${caso.id}/reivindicar?casoProprio=${encodeURIComponent(casoProprio)}`
                      : `/caso/${caso.id}/reivindicar`,
                  )
                }
              />
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.chuva },
  topo: { paddingHorizontal: 22, paddingBottom: 10 },
  foto: { height: 230 },
  carimbo: {
    position: 'absolute',
    top: 10,
    right: 10,
    fontFamily: fontes.dado,
    fontSize: 9.5,
    letterSpacing: 1.2,
    color: cores.textoLegenda,
    borderWidth: 1,
    borderColor: 'rgba(18,62,74,0.35)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  bloco: { paddingHorizontal: 22, paddingTop: 18, gap: 10 },
  divisa: { borderTopWidth: 1, borderTopColor: cores.traco, marginTop: 18 },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quando: { fontFamily: fontes.dado, fontSize: 11, color: cores.apagado },
  titulo: { fontFamily: fontes.tituloForte, fontSize: 25, color: cores.tapajos, letterSpacing: -0.6 },
  paragrafo: { fontFamily: fontes.texto, fontSize: 14.5, lineHeight: 22, color: cores.textoSecundario },
  pequeno: { fontSize: 13, lineHeight: 20 },
  atributos: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderLeftWidth: 1, borderColor: cores.traco },
  atributo: {
    width: '50%',
    paddingHorizontal: 13,
    paddingVertical: 11,
    gap: 3,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: cores.traco,
  },
  rotulo: { fontFamily: fontes.dado, fontSize: 10, letterSpacing: 1.1, color: cores.apagado },
  valor: { fontFamily: fontes.textoForte, fontSize: 15, color: cores.texto },
  acoes: { paddingTop: 16, gap: 10 },
  estado: { paddingHorizontal: 26, paddingTop: 40, gap: 14 },
})
