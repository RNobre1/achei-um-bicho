import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Aviso } from '../../componentes/Aviso'
import { Botao } from '../../componentes/Botao'
import { Campo } from '../../componentes/Campo'
import { GrupoDeChips } from '../../componentes/GrupoDeChips'
import { MapaArea } from '../../componentes/MapaArea'
import type { Dia, Periodo, RascunhoPublicacao } from '../../dominio/publicacao'
import { obterPosicao } from '../../servicos/localizacao'
import { cores, fontes } from '../../tema'

const DIAS: Record<Dia, string> = { hoje: 'Hoje', ontem: 'Ontem' }
const PERIODOS: Record<Periodo, string> = { manha: 'De manhã', tarde: 'À tarde', noite: 'De noite' }

const opcoesDe = <V extends string>(r: Record<V, string>) =>
  (Object.keys(r) as V[]).map((valor) => ({ valor, rotulo: r[valor] }))

/** Raio que a API aplica ao ponto de quem publica: é o círculo que o mural mostra. */
const RAIO_PUBLICADO_M = 300

interface Props {
  rascunho: RascunhoPublicacao
  mudar: (alterar: (r: RascunhoPublicacao) => RascunhoPublicacao) => void
}

export function PassoOndeQuando({ rascunho, mudar }: Props) {
  const [procurando, setProcurando] = useState(false)
  const [semGps, setSemGps] = useState(false)
  const { latitude, longitude } = rascunho.local

  async function localizar() {
    setProcurando(true)
    const posicao = await obterPosicao()
    setProcurando(false)
    // o centro da cidade serve para o mural abrir, nunca para marcar onde o bicho sumiu
    if (posicao.aproximada) {
      setSemGps(true)
      return
    }
    setSemGps(false)
    mudar((r) => ({ ...r, local: { ...r.local, ...posicao.ponto } }))
  }

  useEffect(() => {
    if (latitude === undefined) void localizar()
    // só na primeira vez que o passo aparece
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const mudarLocal = (parte: Partial<RascunhoPublicacao['local']>) =>
    mudar((r) => ({ ...r, local: { ...r.local, ...parte } }))
  const quando = rascunho.quando

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 7 }}>
        <Text style={estilos.rotulo}>
          {(rascunho.tipo === 'perdido' ? 'Onde ele sumiu' : 'Onde você achou').toUpperCase()}
        </Text>
        {latitude !== undefined && longitude !== undefined ? (
          <MapaArea centro={{ latitude, longitude }} raioM={RAIO_PUBLICADO_M} altura={130} />
        ) : null}
        {semGps ? (
          <Aviso
            titulo="Não deu para pegar sua localização."
            texto="Ative a localização do celular e tente de novo. Sem ela o aviso não chega a quem mora perto."
          />
        ) : null}
        <Botao
          rotulo={latitude === undefined ? 'Usar minha localização' : 'Atualizar localização'}
          variante="fraco"
          carregando={procurando}
          aoTocar={() => void localizar()}
        />
        <Text style={estilos.dica}>
          Use a localização de onde {rascunho.tipo === 'perdido' ? 'ele sumiu' : 'ele está'}. O mural mostra só o
          círculo, nunca o endereço.
        </Text>
      </View>
      <Campo rotulo="Bairro" valor={rascunho.local.bairro} aoMudar={(bairro) => mudarLocal({ bairro })} maxLength={80} placeholder="Aparecida, Santa Clara, Prainha…" />
      <Campo
        rotulo="Ponto de referência (opcional)"
        valor={rascunho.local.referencia}
        aoMudar={(referencia) => mudarLocal({ referencia })}
        maxLength={160}
        dica="Fica guardado, mas não aparece para ninguém no caso público."
      />
      <GrupoDeChips
        rotulo="Quando"
        opcoes={opcoesDe(DIAS)}
        marcado={quando?.dia}
        aoEscolher={(dia) => mudar((r) => ({ ...r, quando: { periodo: r.quando?.periodo ?? 'tarde', dia } }))}
      />
      <GrupoDeChips
        rotulo="Em que parte do dia"
        opcoes={opcoesDe(PERIODOS)}
        marcado={quando?.periodo}
        aoEscolher={(periodo) => mudar((r) => ({ ...r, quando: { dia: r.quando?.dia ?? 'hoje', periodo } }))}
      />
    </View>
  )
}

const estilos = StyleSheet.create({
  rotulo: { fontFamily: fontes.dado, fontSize: 10, letterSpacing: 1.1, color: cores.apagado },
  dica: { fontFamily: fontes.texto, fontSize: 12, lineHeight: 17, color: cores.apagado },
})
