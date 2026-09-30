import { COLEIRA, COR, ESPECIE, PORTE, opcoes } from '@achei/contratos'
import { View } from 'react-native'
import { Aviso } from '../../componentes/Aviso'
import { Campo } from '../../componentes/Campo'
import { FotosDoRascunho } from '../../componentes/FotosDoRascunho'
import { GrupoDeChips } from '../../componentes/GrupoDeChips'
import type { RascunhoPublicacao } from '../../dominio/publicacao'

interface Props {
  rascunho: RascunhoPublicacao
  mudar: (alterar: (r: RascunhoPublicacao) => RascunhoPublicacao) => void
}

export function PassoAnimal({ rascunho, mudar }: Props) {
  const animal = rascunho.animal
  const mudarAnimal = (parte: Partial<RascunhoPublicacao['animal']>) =>
    mudar((r) => ({ ...r, animal: { ...r.animal, ...parte } }))

  return (
    <View style={{ gap: 16 }}>
      <FotosDoRascunho fotos={rascunho.fotos} aoMudar={(fotos) => mudar((r) => ({ ...r, fotos }))} />
      <GrupoDeChips rotulo="Bicho" opcoes={opcoes(ESPECIE)} marcado={animal.especie} aoEscolher={(especie) => mudarAnimal({ especie })} />
      <GrupoDeChips rotulo="Porte" opcoes={opcoes(PORTE)} marcado={animal.porte} aoEscolher={(porte) => mudarAnimal({ porte })} />
      <GrupoDeChips
        rotulo="Cor que mais aparece"
        opcoes={opcoes(COR)}
        marcado={animal.corDominante}
        aoEscolher={(corDominante) => mudarAnimal({ corDominante })}
      />
      <GrupoDeChips rotulo="Coleira" opcoes={opcoes(COLEIRA)} marcado={animal.coleira} aoEscolher={(coleira) => mudarAnimal({ coleira })} />
      {rascunho.tipo === 'perdido' ? (
        <Campo rotulo="Nome que ele atende" valor={animal.nome} aoMudar={(nome) => mudarAnimal({ nome })} maxLength={60} />
      ) : null}
      <Campo
        rotulo="O que mais ajuda a reconhecer (opcional)"
        valor={rascunho.relato}
        aoMudar={(relato) => mudar((r) => ({ ...r, relato }))}
        multiline
        maxLength={600}
        placeholder={rascunho.tipo === 'perdido' ? 'Como ele sumiu, jeito, medo de moto…' : 'Onde estava, como está, se está machucado…'}
      />
      {rascunho.tipo === 'encontrado' ? (
        <Aviso texto="Porte, cor e coleira são o que o aplicativo compara com os casos de quem perdeu. Só o que dá para ver já ajuda." />
      ) : null}
    </View>
  )
}
