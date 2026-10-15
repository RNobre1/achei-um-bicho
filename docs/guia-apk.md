# Aplicativo instalável sem loja

Para o alpha e o pitch não precisamos de Play Store nem de App Store: basta um
APK que qualquer Android instala por link. No iPhone a história é outra, e está
no fim deste guia.

## Android: APK pelo EAS Build

O EAS Build é o serviço de build do Expo. Ele compila o APK na nuvem, então não é
preciso Android Studio nem Android SDK na máquina de ninguém.

### Já está feito

- Conta da equipe no Expo, usuário `acheiumbicho`, plano gratuito.
- Projeto `@acheiumbicho/achei-um-bicho` ligado ao repositório (`app.json`).
- Chave de assinatura criada e guardada pelo próprio Expo, na conta. **Não apagar
  essa credencial no painel**: todo APK futuro precisa ser assinado com ela, senão
  o Android recusa instalar por cima da versão anterior.
- Perfil `alpha` no `eas.json`, apontando para a API publicada
  (`EXPO_PUBLIC_API_URL`). O endereço é gravado dentro do APK na hora do build.
- APK do alpha publicado como release do GitHub, que não expira nem pede login. A
  versão atual é a 0.1.3: mapa e envio de foto funcionando no aparelho, a sua foto
  ao lado da outra nas pistas e o prazo do GPS contado depois da permissão (as
  anteriores não servem mais):
  <https://github.com/RNobre1/achei-um-bicho/releases/latest>

### Instalar no celular

No celular Android, abrir
<https://github.com/RNobre1/achei-um-bicho/releases/latest/download/achei-um-bicho-alpha.apk>
(ou ler o QR code do último slide do alpha), baixar e permitir *instalar apps
desconhecidos* para o navegador quando o Android pedir. O Play Protect pode
avisar que o app não é da loja; é esperado. O arquivo tem cerca de 100 MB:
baixar no Wi-Fi.

### A cada versão nova

Com o token de acesso da conta do Expo na variável `EXPO_TOKEN`:

```bash
cd apps/mobile
npx eas build --profile alpha --platform android --non-interactive
```

O build leva uns 20 minutos no plano gratuito, fora a fila, que pode passar de
meia hora. Antes de pedir, subir `version` e `android.versionCode` no `app.json`.
No fim sai um link do Expo, que expira em algumas semanas: baixe o APK e publique
como release nova do GitHub, com o arquivo sempre chamado
`achei-um-bicho-alpha.apk`. Assim o link `releases/latest/download/...` e o QR code
dos slides continuam valendo. O APK instala por cima do anterior e mantém os casos
guardados no aparelho. O `eas-cli`
já está nas dependências de desenvolvimento do aplicativo.

### Build local, se o EAS estiver indisponível

Precisa de Android Studio com Android SDK e JDK 17 instalados:

```bash
cd apps/mobile
npx eas build --profile alpha --platform android --local
```

## iPhone

Não existe APK para iPhone: o iOS só instala aplicativo assinado pela Apple. As
opções, da mais viável à menos:

| Opção | Custo | Serve para |
|---|---|---|
| **Versão web no Safari** | Grátis | Qualquer iPhone, a qualquer hora. Abrir o endereço da versão web e usar *Compartilhar › Adicionar à Tela de Início*: fica com ícone, como um aplicativo. Localização e foto funcionam pelo navegador |
| **Expo Go** | Grátis | Testar o aplicativo nativo. Instalar o Expo Go da App Store, rodar `pnpm --filter @achei/mobile start` no computador, com o iPhone na mesma rede Wi-Fi, e ler o QR code com a câmera. Funciona porque o aplicativo só usa módulos que o Expo Go já traz; exige o computador ligado rodando o comando. O Expo Go da loja só abre projetos da versão mais recente do Expo |
| TestFlight ou distribuição *ad hoc* | US$ 99 por ano | Instalável de verdade. Exige a conta Apple Developer paga; no *ad hoc*, cada iPhone precisa ser cadastrado antes do build |
| Instalar pelo Xcode com Apple ID gratuito | Grátis | Não serve para a banca: precisa de Mac e cabo para cada aparelho, e o app para de abrir depois de 7 dias |

**Conclusão:** instalável de verdade no iPhone, sem loja, só pagando os US$ 99 da
Apple. Para a disciplina não compensa: no pitch, quem tem iPhone usa a versão
web; para testar o aplicativo nativo, o Expo Go.
