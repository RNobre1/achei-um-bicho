import { MOTIVO_DENUNCIA, opcoes, type MotivoDenuncia, type ReivindicacaoParaAutor, type TipoCaso } from '@achei/contratos'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Aviso } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { Campo } from '../../componentes/Campo'
import { GrupoDeChips } from '../../componentes/GrupoDeChips'
import { formatarTempoDesde } from '../../dominio/formatar'
import { AVISO_SEGURANCA_CONTATO, limparTelefone, telefoneValido } from '../../dominio/reivindicacao'
import { api, ErroApi } from '../../servicos/api'
import { cores, fontes } from '../../tema'

interface Props {
  casoId: string
  codigoEdicao: string
  tipo: TipoCaso
}

export function ReivindicacoesDoAutor({ casoId, codigoEdicao, tipo }: Props) {
  const [reivindicacoes, setReivindicacoes] = useState<ReivindicacaoParaAutor[]>()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string>()
  const [decidindo, setDecidindo] = useState<string>()
  const [reivIdParaTelefone, setReivIdParaTelefone] = useState<string>()
  const [telefoneAutor, setTelefoneAutor] = useState('')
  const [reivIdParaDenuncia, setReivIdParaDenuncia] = useState<string>()
  const [motivoDenuncia, setMotivoDenuncia] = useState<MotivoDenuncia>('respostas_suspeitas')
  const [textoDenuncia, setTextoDenuncia] = useState('')
  const [denunciando, setDenunciando] = useState(false)
  const [avisoSucesso, setAvisoSucesso] = useState<string>()

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(undefined)
    try {
      setReivindicacoes(await api.reivindicacoesDoMeuCaso(casoId, codigoEdicao))
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não deu para carregar as reivindicações.')
    } finally {
      setCarregando(false)
    }
  }, [casoId, codigoEdicao])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function decidir(rid: string, veredito: 'aceita' | 'recusada', telefone?: string) {
    setDecidindo(rid)
    setErro(undefined)
    try {
      await api.decidirReivindicacao(casoId, rid, codigoEdicao, veredito, telefone)
      setReivIdParaTelefone(undefined)
      await carregar()
    } catch (e) {
      if (e instanceof ErroApi && e.status === 422) {
        setReivIdParaTelefone(rid)
      } else {
        setErro(e instanceof ErroApi ? e.message : 'Não deu para registrar o veredito.')
      }
    } finally {
      setDecidindo(undefined)
    }
  }

  async function enviarDenuncia(rid: string) {
    setDenunciando(true)
    setErro(undefined)
    try {
      await api.denunciar(casoId, {
        motivo: motivoDenuncia,
        texto: textoDenuncia.trim() || undefined,
        reivindicacaoId: rid,
      })
      setReivIdParaDenuncia(undefined)
      setTextoDenuncia('')
      setAvisoSucesso('Denúncia registrada com sucesso.')
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não deu para enviar a denúncia.')
    } finally {
      setDenunciando(false)
    }
  }

  return (
    <View style={estilos.caixa}>
      <Text style={estilos.selo}>VERIFICAÇÃO · RESPOSTAS RECEBIDAS</Text>
      <Text style={estilos.titulo}>
        {reivindicacoes === undefined
          ? 'Reivindicações'
          : reivindicacoes.length === 0
            ? 'Nenhuma reivindicação ainda'
            : reivindicacoes.length === 1
              ? '1 pessoa reivindicou'
              : `${reivindicacoes.length} pessoas reivindicaram`}
      </Text>

      {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
      {avisoSucesso ? <Aviso titulo="Obrigado pela colaboração" texto={avisoSucesso} /> : null}

      {carregando && !reivindicacoes ? (
        <ActivityIndicator color={cores.tapajos} />
      ) : reivindicacoes?.length === 0 ? (
        <Text style={estilos.texto}>
          Quando alguém disser que o bicho é dela (ou que achou o seu), as respostas aparecerão aqui para você
          conferir antes de liberar o telefone.
        </Text>
      ) : (
        reivindicacoes?.map((reiv) => (
          <View key={reiv.id} style={estilos.item}>
            <View style={estilos.itemTopo}>
              <Text style={estilos.quando}>Recebida {formatarTempoDesde(reiv.criadoEm)}</Text>
              <Text style={[estilos.status, estilos[`status_${reiv.veredito}`]]}>
                {reiv.veredito === 'aceita'
                  ? 'ACEITA'
                  : reiv.veredito === 'recusada'
                    ? 'RECUSADA'
                    : 'AGUARDANDO DECISÃO'}
              </Text>
            </View>

            {reiv.denunciasDoTelefone > 0 ? (
              <View style={estilos.alertaDenuncia}>
                <Text style={estilos.alertaTexto}>
                  Atenção: há {reiv.denunciasDoTelefone} denúncia(s) contra este telefone em outros casos.
                </Text>
              </View>
            ) : null}

            <View style={estilos.perguntas}>
              {reiv.respostas.map((r) => (
                <View key={r.ordem} style={estilos.blocoResposta}>
                  <Text style={estilos.enunciado}>
                    {r.ordem}. {r.enunciado}
                  </Text>
                  <View style={estilos.parRespostas}>
                    <View style={estilos.colunaResp}>
                      <Text style={estilos.rotuloResp}>VOCÊ CADASTROU</Text>
                      <Text style={estilos.respEsperada}>{r.respostaEsperada}</Text>
                    </View>
                    <View style={estilos.colunaResp}>
                      <Text style={estilos.rotuloResp}>A PESSOA RESPONDEU</Text>
                      <Text style={estilos.respDada}>{r.respostaDada}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {reiv.veredito === 'pendente' ? (
              <View style={estilos.acoesPendente}>
                {reivIdParaTelefone === reiv.id ? (
                  <View style={estilos.caixaTelefone}>
                    <Text style={estilos.texto}>
                      Você publicou sem telefone. Para aceitar a reivindicação e liberar o contato mútuo, informe seu
                      telefone:
                    </Text>
                    <Campo
                      rotulo="Seu telefone com DDD"
                      valor={telefoneAutor}
                      aoMudar={setTelefoneAutor}
                      placeholder="(93) 99123-4567"
                      keyboardType="phone-pad"
                    />
                    <View style={estilos.duplaBotoes}>
                      <View style={{ flex: 1 }}>
                        <Botao
                          rotulo="Confirmar aceite"
                          variante="acento"
                          carregando={decidindo === reiv.id}
                          desativado={!telefoneValido(telefoneAutor)}
                          aoTocar={() => void decidir(reiv.id, 'aceita', limparTelefone(telefoneAutor))}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Botao
                          rotulo="Cancelar"
                          variante="fraco"
                          aoTocar={() => setReivIdParaTelefone(undefined)}
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={estilos.duplaBotoes}>
                    <View style={{ flex: 1 }}>
                      <Botao
                        rotulo="Aceitar respostas"
                        variante="acento"
                        carregando={decidindo === reiv.id}
                        aoTocar={() => void decidir(reiv.id, 'aceita')}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Botao
                        rotulo="Recusar"
                        variante="fraco"
                        carregando={decidindo === reiv.id}
                        aoTocar={() => void decidir(reiv.id, 'recusada')}
                      />
                    </View>
                  </View>
                )}

                <Botao
                  rotulo="Denunciar reivindicação"
                  variante="fraco"
                  aoTocar={() => setReivIdParaDenuncia((v) => (v === reiv.id ? undefined : reiv.id))}
                />
              </View>
            ) : null}

            {reiv.veredito === 'aceita' && reiv.contato ? (
              <View style={estilos.caixaContato}>
                <Text style={estilos.rotuloContato}>CONTATO LIBERADO</Text>
                <Text style={estilos.dadoContato}>Nome: {reiv.contato.nome}</Text>
                <Text style={estilos.dadoContato}>Telefone: {reiv.contato.telefone}</Text>
                {reiv.contato.referencia ? (
                  <Text style={estilos.dadoContato}>Onde o bicho está: {reiv.contato.referencia}</Text>
                ) : null}
                <Aviso titulo="Aviso de segurança" texto={AVISO_SEGURANCA_CONTATO} />
                <Botao
                  rotulo="Denunciar esta pessoa"
                  variante="fraco"
                  aoTocar={() => setReivIdParaDenuncia((v) => (v === reiv.id ? undefined : reiv.id))}
                />
              </View>
            ) : null}

            {reivIdParaDenuncia === reiv.id ? (
              <View style={estilos.caixaDenuncia}>
                <Text style={estilos.tituloDenuncia}>Denunciar comportamento suspeito</Text>
                <GrupoDeChips
                  rotulo="Motivo da denúncia"
                  opcoes={opcoes(MOTIVO_DENUNCIA)}
                  marcado={motivoDenuncia}
                  aoEscolher={setMotivoDenuncia}
                />
                <Campo
                  rotulo="Detalhes (opcional)"
                  valor={textoDenuncia}
                  aoMudar={setTextoDenuncia}
                  multiline
                  placeholder="Explique o que aconteceu (ex: pediu dinheiro, ameaçou, etc.)"
                  maxLength={500}
                />
                <View style={estilos.duplaBotoes}>
                  <View style={{ flex: 1 }}>
                    <Botao
                      rotulo="Enviar denúncia"
                      variante="escuro"
                      carregando={denunciando}
                      aoTocar={() => void enviarDenuncia(reiv.id)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Botao
                      rotulo="Cancelar"
                      variante="fraco"
                      aoTocar={() => setReivIdParaDenuncia(undefined)}
                    />
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        ))
      )}
    </View>
  )
}

const estilos = StyleSheet.create({
  caixa: { borderWidth: 1.6, borderColor: cores.tapajos, backgroundColor: cores.branco, padding: 16, gap: 12 },
  selo: { fontFamily: fontes.dadoMedio, fontSize: 9.5, letterSpacing: 1.1, color: cores.perdi },
  titulo: { fontFamily: fontes.titulo, fontSize: 19, color: cores.tapajos },
  texto: { fontFamily: fontes.texto, fontSize: 13.5, lineHeight: 20, color: '#33474D' },
  erro: { fontFamily: fontes.texto, fontSize: 13, color: '#A02020' },
  item: { gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: cores.traco },
  itemTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quando: { fontFamily: fontes.dado, fontSize: 11, color: cores.apagado },
  status: { fontFamily: fontes.dadoMedio, fontSize: 10.5, letterSpacing: 0.8 },
  status_pendente: { color: cores.alter },
  status_aceita: { color: cores.achei },
  status_recusada: { color: cores.perdi },
  alertaDenuncia: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#E8A0A0',
    padding: 10,
  },
  alertaTexto: { fontFamily: fontes.textoForte, fontSize: 12.5, color: '#900' },
  perguntas: { gap: 10 },
  blocoResposta: { gap: 4, backgroundColor: cores.chuva, padding: 10 },
  enunciado: { fontFamily: fontes.textoForte, fontSize: 13, color: cores.tapajos },
  parRespostas: { flexDirection: 'row', gap: 8, marginTop: 4 },
  colunaResp: { flex: 1, gap: 2 },
  rotuloResp: { fontFamily: fontes.dado, fontSize: 9, color: cores.apagado },
  respEsperada: { fontFamily: fontes.texto, fontSize: 12.5, color: cores.texto },
  respDada: { fontFamily: fontes.textoMedio, fontSize: 12.5, color: cores.tapajos },
  acoesPendente: { gap: 8, paddingTop: 4 },
  duplaBotoes: { flexDirection: 'row', gap: 8 },
  caixaTelefone: { gap: 8, padding: 10, backgroundColor: cores.chuva, borderWidth: 1, borderColor: cores.traco },
  caixaContato: { gap: 6, padding: 12, backgroundColor: '#F0F9F5', borderWidth: 1, borderColor: '#A2D5C0' },
  rotuloContato: { fontFamily: fontes.dadoMedio, fontSize: 10, letterSpacing: 1.1, color: cores.achei },
  dadoContato: { fontFamily: fontes.textoForte, fontSize: 14, color: cores.texto },
  caixaDenuncia: { gap: 8, padding: 12, backgroundColor: cores.chuva, borderWidth: 1, borderColor: cores.traco },
  tituloDenuncia: { fontFamily: fontes.textoForte, fontSize: 14, color: cores.tapajos },
})
