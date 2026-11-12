import type { TipoCaso } from '@achei/contratos'
import { useRouter } from 'expo-router'
import { useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Aviso } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { Passos } from '../../componentes/Passos'
import { resultadoDaPublicacao } from '../../dominio/fila'
import {
  PASSOS,
  pendenciasDoPasso,
  rascunhoVazio,
  type RascunhoPublicacao,
} from '../../dominio/publicacao'
import { ErroApi } from '../../servicos/api'
import { enfileirarPublicacao, listarFila, processarFila } from '../../servicos/fila-de-envio'
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
  const [guardadoOffline, setGuardadoOffline] = useState<{ id: string; codigo: string }>()
  const [fotosPendentes, setFotosPendentes] = useState<number>(0)
  const [fotosRecusadas, setFotosRecusadas] = useState<number>(0)
  const [reenviando, setReenviando] = useState(false)

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
    if (rascunho?.tipo !== tipo) setRascunho(rascunhoVazio(tipo))
    irPara(1)
  }

  async function reenviarFotos() {
    if (!publicado) return
    setReenviando(true)
    try {
      await processarFila()
      const fila = await listarFila()
      const item = fila.find((f) => f.casoId === publicado.id)
      if (item) {
        const resultado = resultadoDaPublicacao(item)
        if (resultado.tipo === 'publicado') {
          setFotosPendentes(resultado.fotosPendentes)
          setFotosRecusadas(resultado.fotosRecusadas)
        }
      } else {
        setFotosPendentes(0)
      }
    } finally {
      setReenviando(false)
    }
  }

  /**
   * Publicar passa sempre pela fila (F9): o rascunho fica seguro em disco primeiro.
   * Com conexão, confirma em poucos segundos; sem conexão, avisa que ficou guardado.
   * Erros permanentes mantêm o formulário preenchido.
   */
  async function publicar(r: RascunhoPublicacao) {
    setEnviando(true)
    setErro(undefined)
    try {
      const resultado = await enfileirarPublicacao(r)

      if (resultado.tipo === 'publicado') {
        setFotosPendentes(resultado.fotosPendentes)
        setFotosRecusadas(resultado.fotosRecusadas)
        setPublicado({ id: resultado.casoId, codigo: resultado.codigoEdicao })
        rolagem.current?.scrollTo({ y: 0, animated: false })
      } else if (resultado.tipo === 'guardado') {
        setFotosPendentes(resultado.fotosPendentes)
        setFotosRecusadas(resultado.fotosRecusadas)
        setGuardadoOffline({ id: resultado.idCliente, codigo: resultado.codigoEdicao })
        rolagem.current?.scrollTo({ y: 0, animated: false })
      } else {
        // resultado.tipo === 'recusado' (erro permanente)
        setErro(resultado.mensagem)
      }
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não deu para salvar o caso. Tente de novo.')
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
    if (indice < PASSOS.length - 1) {
      irPara(indice + 1)
      return
    }

    void publicar(rascunho)
  }

  function recomecar() {
    setPublicado(undefined)
    setGuardadoOffline(undefined)
    setFotosPendentes(0)
    setFotosRecusadas(0)
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
            fotosPendentes={fotosPendentes}
            fotosRecusadas={fotosRecusadas}
            reenviando={reenviando}
            aoReenviarFotos={() => void reenviarFotos()}
            aoVerCaso={() => router.push(`/caso/${publicado.id}`)}
            aoPublicarOutro={recomecar}
          />
        ) : guardadoOffline ? (
          <View style={{ gap: 18 }}>
            <Text style={estilos.titulo}>Guardado no celular: sobe sozinho quando a internet voltar</Text>
            <Text style={estilos.texto}>
              O caso e as fotos já estão salvos neste aparelho. Quando o sinal voltar, o envio acontece
              automaticamente sem você precisar preencher nada de novo.
            </Text>
            <View style={estilos.caixa}>
              <Text style={estilos.rotulo}>SEU CÓDIGO DE EDIÇÃO (GERADO NO CELULAR)</Text>
              <Text
                style={estilos.codigo}
                selectable
                accessibilityLabel={`Código ${guardadoOffline.codigo.split('').join(' ')}`}
              >
                {guardadoOffline.codigo}
              </Text>
            </View>
            <Aviso
              titulo="Anote ou tire um print."
              texto="O código já foi gerado de forma segura no aparelho e será o mesmo registrado no servidor assim que o envio confirmar."
            />
            <Botao rotulo="Ver fila de envio" variante="escuro" aoTocar={() => router.push('/fila')} />
            <Botao rotulo="Publicar outro caso" variante="fraco" aoTocar={recomecar} />
          </View>
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
            {erro ? <Aviso titulo="Não deu para salvar o caso" texto={erro} /> : null}

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
  texto: { fontFamily: fontes.texto, fontSize: 14.5, lineHeight: 22, color: '#33474D' },
  caixa: { borderWidth: 1.6, borderColor: cores.tapajos, backgroundColor: cores.branco, padding: 18, gap: 8, alignItems: 'center' },
  codigo: { fontFamily: fontes.dadoMedio, fontSize: 32, letterSpacing: 4, color: cores.tapajos },
})
