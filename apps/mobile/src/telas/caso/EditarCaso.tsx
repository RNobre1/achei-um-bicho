import {
  COLEIRA,
  COR,
  PORTE,
  opcoes,
  type Coleira,
  type Cor,
  type Porte,
} from '@achei/contratos'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Aviso } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { Campo } from '../../componentes/Campo'
import { GrupoDeChips } from '../../componentes/GrupoDeChips'
import { Voltar } from '../../componentes/Voltar'
import { api, ErroApi } from '../../servicos/api'
import { meuCaso } from '../../servicos/meus-casos'
import { cores, fontes } from '../../tema'

type OpcaoCastrado = 'sim' | 'nao' | 'nao_informado'

const OPCOES_CASTRADO: readonly { valor: OpcaoCastrado; rotulo: string }[] = [
  { valor: 'sim', rotulo: 'Sim' },
  { valor: 'nao', rotulo: 'Não' },
  { valor: 'nao_informado', rotulo: 'Não informado' },
]

export function EditarCaso() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const margens = useSafeAreaInsets()

  const [codigoEdicao, setCodigoEdicao] = useState<string>()
  const [carregando, setCarregando] = useState(true)

  const [relato, setRelato] = useState('')
  const [porte, setPorte] = useState<Porte>()
  const [corDominante, setCorDominante] = useState<Cor>()
  const [coleira, setColeira] = useState<Coleira>()
  const [nome, setNome] = useState('')
  const [castrado, setCastrado] = useState<OpcaoCastrado>('nao_informado')

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string>()
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      const guardado = await meuCaso(id)
      if (guardado) {
        setCodigoEdicao(guardado.codigoEdicao)
      }
      try {
        const caso = await api.abrirCaso(id)
        setRelato(caso.relato ?? '')
        setPorte(caso.animal.porte)
        setCorDominante(caso.animal.corDominante)
        setColeira(caso.animal.coleira)
        setNome(caso.animal.nome ?? '')
        if (caso.animal.castrado === true) {
          setCastrado('sim')
        } else if (caso.animal.castrado === false) {
          setCastrado('nao')
        } else {
          setCastrado('nao_informado')
        }
      } catch (e) {
        setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar os dados do caso.')
      } finally {
        setCarregando(false)
      }
    }
    void carregar()
  }, [id])

  async function salvar() {
    if (!codigoEdicao) {
      setErro('Código de edição não encontrado neste aparelho.')
      return
    }

    setSalvando(true)
    setErro(undefined)
    try {
      const castradoBooleano = castrado === 'sim' ? true : castrado === 'nao' ? false : undefined

      await api.editarCaso(id, codigoEdicao, {
        relato: relato.trim() || undefined,
        animal: {
          porte,
          corDominante,
          coleira,
          nome: nome.trim() || undefined,
          castrado: castradoBooleano,
        },
      })
      setSalvo(true)
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível salvar as alterações.')
    } finally {
      setSalvando(false)
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
        ) : salvo ? (
          <View style={{ gap: 16 }}>
            <Text style={estilos.titulo}>Caso atualizado.</Text>
            <Text style={estilos.paragrafo}>
              Os dados foram salvos e os pareamentos com outros casos foram recalculados.
            </Text>
            <Botao rotulo="Voltar para Meus Casos" aoTocar={() => router.replace('/(abas)/meus-casos')} />
          </View>
        ) : (
          <View style={{ gap: 18 }}>
            <View style={{ gap: 6 }}>
              <Text style={estilos.rotulo}>EDITAR CASO</Text>
              <Text style={estilos.titulo}>Editar informações</Text>
              <Text style={estilos.paragrafo}>
                Atualize as características do animal e o relato. Espécie e local não mudam porque definem o caso original.
              </Text>
            </View>

            <Campo
              rotulo="Nome do animal"
              valor={nome}
              aoMudar={setNome}
              placeholder="Nome que ele atende ou como é chamado"
            />

            <GrupoDeChips
              rotulo="Porte"
              opcoes={opcoes(PORTE)}
              marcado={porte}
              aoEscolher={setPorte}
            />

            <GrupoDeChips
              rotulo="Cor predominante"
              opcoes={opcoes(COR)}
              marcado={corDominante}
              aoEscolher={setCorDominante}
            />

            <GrupoDeChips
              rotulo="Coleira"
              opcoes={opcoes(COLEIRA)}
              marcado={coleira}
              aoEscolher={setColeira}
            />

            <GrupoDeChips
              rotulo="Castrado"
              opcoes={OPCOES_CASTRADO}
              marcado={castrado}
              aoEscolher={setCastrado}
            />

            <Campo
              rotulo="Relato"
              valor={relato}
              aoMudar={setRelato}
              multiline
              maxLength={500}
              placeholder="Detalhes adicionais que ajudam a identificar o animal ou o contexto"
            />

            {erro ? <Aviso titulo="Erro ao salvar" texto={erro} /> : null}

            <Botao
              rotulo={salvando ? 'Salvando...' : 'Salvar alterações'}
              aoTocar={salvar}
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
