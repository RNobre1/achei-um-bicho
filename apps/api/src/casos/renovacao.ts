export function dadosDeRenovacao(agora: Date = new Date()) {
  return {
    ultimaInteracaoEm: agora,
    cobradoEm: null,
  }
}
