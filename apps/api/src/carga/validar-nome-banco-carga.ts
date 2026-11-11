export function validarNomeBancoCarga(nomeBanco: string): void {
  if (!nomeBanco.startsWith('achei_carga')) {
    throw new Error('NOME_BANCO precisa começar com achei_carga para proteger bancos que não são de carga.')
  }
}
