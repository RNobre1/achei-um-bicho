import type { NovoDesfecho, SituacaoDoCaso } from '@achei/contratos'
import { describe, expect, it } from 'vitest'
import {
  acoesDisponiveis,
  momentoDoDesfecho,
  montarDesfecho,
  pendenciasDoDesfecho,
  textoDaSituacao,
  validarDesfecho,
} from './ciclo-de-vida'

describe('ciclo de vida no domínio mobile', () => {
  describe('ações disponíveis por estado', () => {
    it('caso aberto sem cobrança permite editar e encerrar', () => {
      const acoesPerdido = acoesDisponiveis({ estado: 'procurando', cobrancaPendente: false })
      expect(acoesPerdido).toEqual(['editar', 'encerrar'])

      const acoesAchado = acoesDisponiveis({ estado: 'abrigado_temporariamente', cobrancaPendente: false })
      expect(acoesAchado).toEqual(['editar', 'encerrar'])
    })

    it('caso aberto com cobrança pendente inclui confirmação', () => {
      const acoes = acoesDisponiveis({ estado: 'procurando', cobrancaPendente: true })
      expect(acoes).toEqual(['confirmar', 'editar', 'encerrar'])
    })

    it('caso em_contato permite reabertura e encerramento, e confirmação se cobrado', () => {
      const semCobranca = acoesDisponiveis({ estado: 'em_contato', cobrancaPendente: false })
      expect(semCobranca).toEqual(['reabrir', 'encerrar'])

      const comCobranca = acoesDisponiveis({ estado: 'em_contato', cobrancaPendente: true })
      expect(comCobranca).toEqual(['confirmar', 'reabrir', 'encerrar'])
    })

    it('caso expirado permite apenas encerramento tardio com desfecho', () => {
      const acoes = acoesDisponiveis({ estado: 'expirado', cobrancaPendente: false })
      expect(acoes).toEqual(['encerrar'])
    })

    it('caso resolvido não oferece nenhuma ação adicional', () => {
      const acoes = acoesDisponiveis({ estado: 'resolvido', cobrancaPendente: false })
      expect(acoes).toEqual([])
    })
  })

  describe('texto da situação', () => {
    it('caso resolvido exibe o rótulo do desfecho', () => {
      const texto = textoDaSituacao({
        estado: 'resolvido',
        desfecho: { tipo: 'voltou_para_casa', ocorridoEm: '2026-10-01T10:00:00.000Z' },
      })
      expect(texto).toBe('Resolvido · Voltou para casa')
    })

    it('caso resolvido sem desfecho exibe apenas Resolvido', () => {
      const texto = textoDaSituacao({ estado: 'resolvido', desfecho: null })
      expect(texto).toBe('Resolvido')
    })

    it('cobrança pendente exibe aviso de busca', () => {
      const texto = textoDaSituacao({ estado: 'procurando', cobrancaPendente: true })
      expect(texto).toBe('Ainda está procurando?')
    })

    it('exibe rótulo padrão nos demais estados', () => {
      expect(textoDaSituacao({ estado: 'procurando', cobrancaPendente: false })).toBe('Procurando')
      expect(textoDaSituacao({ estado: 'abrigado_temporariamente', cobrancaPendente: false })).toBe(
        'Abrigado por alguém',
      )
      expect(textoDaSituacao({ estado: 'em_contato', cobrancaPendente: false })).toBe('Em contato')
      expect(textoDaSituacao({ estado: 'expirado', cobrancaPendente: false })).toBe('Expirado')
    })
  })

  describe('validação e montagem de desfecho', () => {
    const agora = new Date('2026-10-15T12:00:00.000Z')

    it('calcula momento para hoje, ontem e outro dia', () => {
      expect(momentoDoDesfecho('hoje', undefined, agora)).toBe('2026-10-15T12:00:00.000Z')
      expect(momentoDoDesfecho('ontem', undefined, agora)).toBe('2026-10-14T12:00:00.000Z')
      expect(momentoDoDesfecho('outro_dia', '2026-10-10T08:00:00.000Z', agora)).toBe('2026-10-10T08:00:00.000Z')
    })

    it('aponta pendências de formulário incompleto', () => {
      expect(pendenciasDoDesfecho({})).toContain('Escolha o desfecho do caso')
      expect(pendenciasDoDesfecho({})).toContain('Diga quando o desfecho aconteceu')
      expect(pendenciasDoDesfecho({ quando: 'outro_dia' })).toContain('Informe uma data válida para o desfecho')
    })

    it('monta corpo de NovoDesfecho válido', () => {
      const desfecho = montarDesfecho({ tipo: 'foi_adotado', quando: 'ontem' }, agora)
      expect(desfecho).toEqual({
        tipo: 'foi_adotado',
        ocorridoEm: '2026-10-14T12:00:00.000Z',
      })
    })

    it('validação direta rejeita desfecho inválido ou no futuro', () => {
      expect(validarDesfecho({})).toContain('Escolha o desfecho do caso')
      expect(validarDesfecho({ tipo: 'invalido' as any })).toContain('Desfecho inválido')
      expect(validarDesfecho({ tipo: 'voltou_para_casa', ocorridoEm: '2026-10-20T12:00:00.000Z' }, agora)).toContain(
        'Data do desfecho não pode ser no futuro',
      )
      expect(validarDesfecho({ tipo: 'voltou_para_casa', ocorridoEm: '2026-10-10T12:00:00.000Z' }, agora)).toEqual([])
    })
  })
})
