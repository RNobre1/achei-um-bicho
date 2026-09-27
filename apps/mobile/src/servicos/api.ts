import type { CasoAberto, CasoPublicado, ConsultaMural, Mural, NovaPublicacao } from '@achei/contratos'

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
}

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
  }
}

/** Cliente usado pelas telas, apontado para a API configurada no .env do aplicativo. */
export const api = criarClienteApi(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333')
