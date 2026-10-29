import {
  CABECALHO_CODIGO_ACOMPANHAMENTO,
  CABECALHO_CODIGO_EDICAO,
  CAMPO_FOTO,
  type AvistamentoParaAutor,
  type AvistamentoRegistrado,
  type CasoAberto,
  type CasoPublicado,
  type ConsultaMural,
  type DenunciaRegistrada,
  type EdicaoDoCaso,
  type FotoEnviada,
  type Mural,
  type NovaDenuncia,
  type NovaPublicacao,
  type NovaReivindicacao,
  type NovoAvistamento,
  type NovoDesfecho,
  type PerguntaPublica,
  type Pista,
  type ReivindicacaoParaAutor,
  type ReivindicacaoRegistrada,
  type SituacaoDaReivindicacao,
  type SituacaoDoCaso,
  type VereditoVerificacao,
} from '@achei/contratos'

const SEM_CONEXAO = 'Sem conexão com o servidor. Confira a internet e tente de novo.'

/** Erro que a tela pode mostrar como está. status 0 quer dizer que a rede falhou. */
export class ErroApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem)
    this.name = 'ErroApi'
  }
}

export interface ClienteApi {
  mural(consulta: ConsultaMural): Promise<Mural>
  abrirCaso(id: string): Promise<CasoAberto>
  publicar(dados: NovaPublicacao): Promise<CasoPublicado>
  registrarAvistamento(casoId: string, dados: NovoAvistamento): Promise<AvistamentoRegistrado>
  avistamentosDoMeuCaso(casoId: string, codigoEdicao: string): Promise<AvistamentoParaAutor[]>
  enviarFoto(casoId: string, codigoEdicao: string, arquivo: ArquivoDeFoto): Promise<FotoEnviada>
  urlDaFoto(caminho: string): string
  pistasDoMeuCaso(casoId: string, codigoEdicao: string): Promise<Pista[]>
  descartarPista(casoId: string, pistaId: string, codigoEdicao: string): Promise<void>
  perguntas(casoId: string): Promise<PerguntaPublica[]>
  reivindicar(casoId: string, dados: NovaReivindicacao): Promise<ReivindicacaoRegistrada>
  reivindicacoesDoMeuCaso(casoId: string, codigoEdicao: string): Promise<ReivindicacaoParaAutor[]>
  decidirReivindicacao(
    casoId: string,
    reivindicacaoId: string,
    codigoEdicao: string,
    veredito: 'aceita' | 'recusada',
    telefone?: string,
  ): Promise<{ id: string; veredito: VereditoVerificacao }>
  situacaoDaReivindicacao(id: string, codigoAcompanhamento: string): Promise<SituacaoDaReivindicacao>
  denunciar(casoId: string, dados: NovaDenuncia): Promise<DenunciaRegistrada>
  situacaoDoCaso(casoId: string, codigoEdicao: string): Promise<SituacaoDoCaso>
  confirmarCaso(casoId: string, codigoEdicao: string): Promise<void>
  reabrirCaso(casoId: string, codigoEdicao: string): Promise<void>
  encerrarCaso(casoId: string, codigoEdicao: string, dados: NovoDesfecho): Promise<void>
  editarCaso(casoId: string, codigoEdicao: string, dados: EdicaoDoCaso): Promise<void>
}

/** Blob na web; no celular, o File do expo-file-system, que se comporta como Blob. */
export type ArquivoDeFoto = Blob

type Buscar = (url: string, opcoes?: RequestInit) => Promise<Response>

async function mensagemDoErro(resposta: Response): Promise<string> {
  try {
    const corpo = (await resposta.json()) as { message?: string | string[] }
    if (Array.isArray(corpo.message)) return corpo.message.join('\n')
    if (corpo.message) return corpo.message
  } catch {
    // corpo que não é JSON: fica a mensagem genérica
  }
  return `O servidor respondeu com erro ${resposta.status}.`
}

export function criarClienteApi(urlBase: string, buscar: Buscar = fetch): ClienteApi {
  const base = urlBase.replace(/\/+$/, '')

  async function pedir<T>(caminho: string, opcoes?: RequestInit): Promise<T> {
    let resposta: Response
    try {
      resposta = await buscar(`${base}${caminho}`, opcoes)
    } catch {
      throw new ErroApi(0, SEM_CONEXAO)
    }
    if (!resposta.ok) throw new ErroApi(resposta.status, await mensagemDoErro(resposta))
    return (await resposta.json()) as T
  }

  return {
    mural(consulta) {
      const parametros = new URLSearchParams()
      for (const [chave, valor] of Object.entries(consulta)) {
        if (valor !== undefined) parametros.set(chave, String(valor))
      }
      return pedir<Mural>(`/casos?${parametros.toString()}`)
    },
    abrirCaso(id) {
      return pedir<CasoAberto>(`/casos/${encodeURIComponent(id)}`)
    },
    publicar(dados) {
      return pedir<CasoPublicado>('/casos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      })
    },
    registrarAvistamento(casoId, dados) {
      return pedir<AvistamentoRegistrado>(`/casos/${encodeURIComponent(casoId)}/avistamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      })
    },
    enviarFoto(casoId, codigoEdicao, arquivo) {
      const formulario = new FormData()
      // o nome vale para o Blob da web; o File do celular já leva o próprio nome
      formulario.append(CAMPO_FOTO, arquivo, 'foto.jpg')
      return pedir<FotoEnviada>(`/casos/${encodeURIComponent(casoId)}/fotos`, {
        method: 'POST',
        headers: { [CABECALHO_CODIGO_EDICAO]: codigoEdicao },
        body: formulario,
      })
    },
    urlDaFoto(caminho) {
      return `${base}${caminho}`
    },
    pistasDoMeuCaso(casoId, codigoEdicao) {
      return pedir<Pista[]>(`/casos/${encodeURIComponent(casoId)}/pistas`, {
        headers: { [CABECALHO_CODIGO_EDICAO]: codigoEdicao },
      })
    },
    async descartarPista(casoId, pistaId, codigoEdicao) {
      await pedir(`/casos/${encodeURIComponent(casoId)}/pistas/${encodeURIComponent(pistaId)}/veredito`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [CABECALHO_CODIGO_EDICAO]: codigoEdicao },
        body: JSON.stringify({ veredito: 'descartado' }),
      })
    },
    avistamentosDoMeuCaso(casoId, codigoEdicao) {
      return pedir<AvistamentoParaAutor[]>(`/casos/${encodeURIComponent(casoId)}/avistamentos`, {
        headers: { [CABECALHO_CODIGO_EDICAO]: codigoEdicao },
      })
    },
    perguntas(casoId) {
      return pedir<PerguntaPublica[]>(`/casos/${encodeURIComponent(casoId)}/perguntas`)
    },
    reivindicar(casoId, dados) {
      return pedir<ReivindicacaoRegistrada>(`/casos/${encodeURIComponent(casoId)}/reivindicacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      })
    },
    reivindicacoesDoMeuCaso(casoId, codigoEdicao) {
      return pedir<ReivindicacaoParaAutor[]>(`/casos/${encodeURIComponent(casoId)}/reivindicacoes`, {
        headers: { [CABECALHO_CODIGO_EDICAO]: codigoEdicao },
      })
    },
    decidirReivindicacao(casoId, reivindicacaoId, codigoEdicao, veredito, telefone) {
      return pedir<{ id: string; veredito: VereditoVerificacao }>(
        `/casos/${encodeURIComponent(casoId)}/reivindicacoes/${encodeURIComponent(reivindicacaoId)}/veredito`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', [CABECALHO_CODIGO_EDICAO]: codigoEdicao },
          body: JSON.stringify({ veredito, ...(telefone && { telefone }) }),
        },
      )
    },
    situacaoDaReivindicacao(id, codigoAcompanhamento) {
      return pedir<SituacaoDaReivindicacao>(`/reivindicacoes/${encodeURIComponent(id)}`, {
        headers: { [CABECALHO_CODIGO_ACOMPANHAMENTO]: codigoAcompanhamento },
      })
    },
    denunciar(casoId, dados) {
      return pedir<DenunciaRegistrada>(`/casos/${encodeURIComponent(casoId)}/denuncias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      })
    },
    situacaoDoCaso(casoId, codigoEdicao) {
      return pedir<SituacaoDoCaso>(`/casos/${encodeURIComponent(casoId)}/situacao`, {
        headers: { [CABECALHO_CODIGO_EDICAO]: codigoEdicao },
      })
    },
    async confirmarCaso(casoId, codigoEdicao) {
      await pedir(`/casos/${encodeURIComponent(casoId)}/confirmacao`, {
        method: 'POST',
        headers: { [CABECALHO_CODIGO_EDICAO]: codigoEdicao },
      })
    },
    async reabrirCaso(casoId, codigoEdicao) {
      await pedir(`/casos/${encodeURIComponent(casoId)}/reabertura`, {
        method: 'POST',
        headers: { [CABECALHO_CODIGO_EDICAO]: codigoEdicao },
      })
    },
    async encerrarCaso(casoId, codigoEdicao, dados) {
      await pedir(`/casos/${encodeURIComponent(casoId)}/desfecho`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [CABECALHO_CODIGO_EDICAO]: codigoEdicao },
        body: JSON.stringify(dados),
      })
    },
    async editarCaso(casoId, codigoEdicao, dados) {
      await pedir(`/casos/${encodeURIComponent(casoId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', [CABECALHO_CODIGO_EDICAO]: codigoEdicao },
        body: JSON.stringify(dados),
      })
    },
  }
}

/** Cliente usado pelas telas, apontado para a API configurada no .env do aplicativo. */
export const api = criarClienteApi(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333')
