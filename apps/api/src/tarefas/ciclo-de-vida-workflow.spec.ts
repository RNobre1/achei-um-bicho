import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TAREFA_DIARIA } from '@achei/contratos'
import { describe, expect, it } from 'vitest'

const CAMINHO_WORKFLOW = resolve(__dirname, '../../../../.github/workflows/ciclo-de-vida.yml')

describe('ação agendada de ciclo de vida (.github/workflows/ciclo-de-vida.yml)', () => {
  it('existe e tem o cron sincronizado com TAREFA_DIARIA.cronUtc', () => {
    expect(existsSync(CAMINHO_WORKFLOW), 'o arquivo do workflow precisa existir').toBe(true)
    const conteudo = readFileSync(CAMINHO_WORKFLOW, 'utf-8')

    // Deve ter workflow_dispatch
    expect(conteudo).toContain('workflow_dispatch')

    // Deve ter schedule com o cron do manifesto de contratos
    expect(conteudo).toContain(`cron: '${TAREFA_DIARIA.cronUtc}'`)
  })

  it('chama o endpoint com curl, segredo TAREFAS_CHAVE e tolerância a dormência da API', () => {
    const conteudo = readFileSync(CAMINHO_WORKFLOW, 'utf-8')

    expect(conteudo).toContain('https://achei-um-bicho-api.onrender.com/tarefas/ciclo-de-vida')
    expect(conteudo).toContain('secrets.TAREFAS_CHAVE')
    expect(conteudo).toContain('x-chave-tarefas')
    expect(conteudo).toContain('--max-time 120')
    expect(conteudo).toContain('--retry 5')
    expect(conteudo).toContain('--retry-delay 30')
    expect(conteudo).toContain('--retry-all-errors')
  })
})
