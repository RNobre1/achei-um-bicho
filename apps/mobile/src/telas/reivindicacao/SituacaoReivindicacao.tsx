import { MOTIVO_DENUNCIA, opcoes, type MotivoDenuncia, type SituacaoDaReivindicacao as Situacao } from '@achei/contratos'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Aviso } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { Campo } from '../../componentes/Campo'
import { GrupoDeChips } from '../../componentes/GrupoDeChips'
import { Voltar } from '../../componentes/Voltar'
import { AVISO_SEGURANCA_CONTATO, ROTULOS_VEREDITO_SITUACAO } from '../../dominio/reivindicacao'
import { api, ErroApi } from '../../servicos/api'
import { minhaReivindicacao } from '../../servicos/minhas-reivindicacoes'
import { cores, fontes } from '../../tema'

export function SituacaoReivindicacao() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const margens = useSafeAreaInsets()

  const [situacao, setSituacao] = useState<Situacao>()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string>()
  const [denunciando, setDenunciando] = useState(false)
  const [enviandoDenuncia, setEnviandoDenuncia] = useState(false)
  const [motivoDenuncia, setMotivoDenuncia] = useState<MotivoDenuncia>('respostas_suspeitas')
  const [textoDenuncia, setTextoDenuncia] = useState('')
  const [avisoSucesso, setAvisoSucesso] = useState<string>()

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(undefined)
    try {
      const salva = await minhaReivindicacao(id)
      if (!salva) {
        setErro('Reivindicação não encontrada neste aparelho.')
        return
      }
      const res = await api.situacaoDaReivindicacao(id, salva.codigoAcompanhamento)
      setSituacao(res)
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não deu para carregar a situação.')
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function enviarDenuncia() {
    if (!situacao) return
    setEnviandoDenuncia(true)
    setErro(undefined)
    try {
      await api.denunciar(situacao.caso.id, {
        motivo: motivoDenuncia,
        texto: textoDenuncia.trim() || undefined,
        reivindicacaoId: id,
      })
      setDenunciando(false)
      setTextoDenuncia('')
      setAvisoSucesso('Denúncia registrada com sucesso.')
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não deu para enviar a denúncia.')
    } finally {
      setEnviandoDenuncia(false)
    }
  }

  return (
    <View style={[estilos.tela, { paddingTop: margens.top + 10 }]}>
      <View style={estilos.topo}>
        <Voltar rotulo="Meus casos" />
      </View>

      {carregando && !situacao ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={cores.tapajos} />
      ) : erro ? (
        <View style={estilos.estado}>
          <Text style={estilos.titulo}>Não foi possível carregar</Text>
          <Text style={estilos.paragrafo}>{erro}</Text>
          <Botao rotulo="Tentar de novo" aoTocar={() => void carregar()} />
        </View>
      ) : situacao ? (
        <ScrollView contentContainerStyle={[estilos.conteudo, { paddingBottom: margens.bottom + 24 }]}>
          <Text style={estilos.selo}>SITUAÇÃO DA REIVINDICAÇÃO</Text>
          <Text style={estilos.titulo}>
            {ROTULOS_VEREDITO_SITUACAO[situacao.veredito]}
          </Text>

          {avisoSucesso ? <Aviso titulo="Obrigado" texto={avisoSucesso} /> : null}

          {situacao.veredito === 'pendente' ? (
            <View style={estilos.bloco}>
              <Text style={estilos.paragrafo}>
                Quem publicou o caso vai conferir suas respostas para verificar se os sinais particulares coincidem.
                Assim que houver uma decisão, você verá o resultado aqui.
              </Text>
            </View>
          ) : null}

          {situacao.veredito === 'recusada' ? (
            <View style={estilos.bloco}>
              <Text style={estilos.paragrafo}>
                Quem publicou o caso conferiu as respostas e elas não coincidiram com o cadastro. Por segurança, os dados
                de contato permanecem protegidos.
              </Text>
            </View>
          ) : null}

          {situacao.veredito === 'aceita' && situacao.contato ? (
            <View style={estilos.caixaContato}>
              <Text style={estilos.rotuloContato}>CONTATO LIBERADO</Text>
              <Text style={estilos.dadoContato}>Nome: {situacao.contato.nome}</Text>
              <Text style={estilos.dadoContato}>Telefone: {situacao.contato.telefone}</Text>
              {situacao.contato.referencia ? (
                <Text style={estilos.dadoContato}>Referência: {situacao.contato.referencia}</Text>
              ) : null}
              <Aviso titulo="Aviso de segurança" texto={AVISO_SEGURANCA_CONTATO} />
            </View>
          ) : null}

          <View style={estilos.blocoBotoes}>
            <Botao
              rotulo="Ver o caso"
              variante="fraco"
              aoTocar={() => router.push(`/caso/${situacao.caso.id}`)}
            />
            <Botao
              rotulo="Denunciar"
              variante="fraco"
              aoTocar={() => setDenunciando((v) => !v)}
            />
          </View>

          {denunciando ? (
            <View style={estilos.caixaDenuncia}>
              <Text style={estilos.tituloDenuncia}>Denunciar comportamento suspeito</Text>
              <GrupoDeChips
                rotulo="Motivo da denúncia"
                opcoes={opcoes(MOTIVO_DENUNCIA)}
                marcado={motivoDenuncia}
                aoEscolher={setMotivoDenuncia}
              />
              <Campo
                rotulo="Texto da denúncia (opcional)"
                valor={textoDenuncia}
                aoMudar={setTextoDenuncia}
                multiline
                placeholder="Descreva o que ocorreu (ex: pediu dinheiro, golpe, etc.)"
                maxLength={500}
              />
              <View style={estilos.duplaBotoes}>
                <View style={{ flex: 1 }}>
                  <Botao
                    rotulo="Enviar denúncia"
                    variante="escuro"
                    carregando={enviandoDenuncia}
                    aoTocar={() => void enviarDenuncia()}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Botao rotulo="Cancelar" variante="fraco" aoTocar={() => setDenunciando(false)} />
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  )
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.chuva },
  topo: { paddingHorizontal: 22, paddingBottom: 10 },
  conteudo: { paddingHorizontal: 22, paddingTop: 10, gap: 16 },
  selo: { fontFamily: fontes.dadoMedio, fontSize: 10.5, letterSpacing: 1.1, color: cores.perdi },
  titulo: { fontFamily: fontes.tituloForte, fontSize: 24, color: cores.tapajos, letterSpacing: -0.6 },
  paragrafo: { fontFamily: fontes.texto, fontSize: 14.5, lineHeight: 22, color: '#33474D' },
  bloco: { backgroundColor: cores.branco, padding: 16, borderWidth: 1, borderColor: cores.traco },
  caixaContato: { gap: 8, padding: 16, backgroundColor: '#F0F9F5', borderWidth: 1.6, borderColor: '#A2D5C0' },
  rotuloContato: { fontFamily: fontes.dadoMedio, fontSize: 10.5, letterSpacing: 1.1, color: cores.achei },
  dadoContato: { fontFamily: fontes.textoForte, fontSize: 15, color: cores.texto },
  blocoBotoes: { gap: 10, paddingTop: 8 },
  caixaDenuncia: { gap: 10, padding: 14, backgroundColor: cores.branco, borderWidth: 1.4, borderColor: cores.traco },
  tituloDenuncia: { fontFamily: fontes.titulo, fontSize: 16, color: cores.tapajos },
  duplaBotoes: { flexDirection: 'row', gap: 10 },
  estado: { paddingHorizontal: 22, paddingTop: 40, gap: 14 },
})
