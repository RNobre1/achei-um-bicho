# Aplicativo instalável sem loja

Para o alpha e o pitch não precisamos de Play Store nem de App Store: basta um
APK que qualquer Android instala por link. No iPhone a história é outra, e está
no fim deste guia.

## Android: APK pelo EAS Build

O EAS Build é o serviço de build do Expo. Ele compila o APK na nuvem, então não é
preciso Android Studio nem Android SDK na máquina de ninguém.

### O que precisa

| Item | Custo | Observação |
|---|---|---|
| Conta no Expo (expo.dev) | Grátis | Uma conta da equipe; os três podem ser membros |
| API no ar, com HTTPS | Grátis | Ver [hospedagem.md](hospedagem.md). Sem ela o APK só funciona na mesma rede Wi-Fi do computador que roda a API |
| Celular Android | — | Qualquer um da equipe, para o teste real (RNF1) |

O plano gratuito do EAS tem um número limitado de builds por mês e fila de menor
prioridade (o build pode esperar alguns minutos para começar). Para o projeto,
sobra.

### Passo a passo

1. **Entrar no Expo e ligar o projeto** (uma vez só):

   ```bash
   cd apps/mobile
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```

   O `init` grava o identificador do projeto no `app.json`. Esse arquivo muda e
   deve ser commitado.

2. **Dizer ao aplicativo onde está a API.** Variável `EXPO_PUBLIC_` é gravada
   dentro do APK na hora do build, então o endereço tem que estar definido antes.
   No `eas.json`, dentro do perfil `alpha`:

   ```json
   "alpha": {
     "distribution": "internal",
     "android": { "buildType": "apk" },
     "env": { "EXPO_PUBLIC_API_URL": "https://<nome-da-api>.onrender.com" }
   }
   ```

3. **Gerar o APK:**

   ```bash
   npx eas-cli@latest build --profile alpha --platform android
   ```

   Na primeira vez o EAS pergunta se pode criar a chave de assinatura: responder
   que sim. Ele guarda a chave na conta. **Todo APK futuro precisa ser assinado
   com a mesma chave**, senão o Android recusa instalar por cima da versão
   anterior. Não apagar essa credencial no painel do Expo.

4. **Instalar:** no fim do build aparece um link e um QR code. No celular, abrir
   o link, baixar o APK e permitir *instalar apps desconhecidos* para o navegador
   quando o Android pedir. O Play Protect pode avisar que o app não é da loja;
   é esperado.

### A cada versão nova

Repetir o passo 3 e mandar o link novo para quem vai testar. O APK instala por
cima do anterior e mantém os casos guardados no aparelho.

### Build local, se o EAS estiver indisponível

Precisa de Android Studio com Android SDK e JDK 17 instalados:

```bash
cd apps/mobile
npx eas-cli@latest build --profile alpha --platform android --local
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
