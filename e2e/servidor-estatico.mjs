import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORTA = Number(process.env.PORTA_WEB ?? 8081)
const DIRETORIO = path.resolve(__dirname, '../apps/mobile/dist-web')

const TIPOS_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
}

function responderArquivo(res, caminho) {
  const ext = path.extname(caminho).toLowerCase()
  const mime = TIPOS_MIME[ext] ?? 'application/octet-stream'

  fs.readFile(caminho, (erro, conteudo) => {
    if (erro) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Erro ao ler arquivo estático')
      return
    }
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': conteudo.length,
      'Cache-Control': 'no-cache',
    })
    res.end(conteudo)
  })
}

const servidor = http.createServer((req, res) => {
  const urlLimpa = (req.url || '/').split('?')[0].split('#')[0]
  let caminho = path.join(DIRETORIO, decodeURIComponent(urlLimpa))

  // Se o caminho aponta para um diretório, procura index.html nele
  if (fs.existsSync(caminho) && fs.statSync(caminho).isDirectory()) {
    caminho = path.join(caminho, 'index.html')
  }

  // Se o arquivo existe e é arquivo, serve direto
  if (fs.existsSync(caminho) && fs.statSync(caminho).isFile()) {
    responderArquivo(res, caminho)
    return
  }

  // Rota desconhecida: devolve index.html da raiz para o Expo Router assumir no cliente
  const indexRaiz = path.join(DIRETORIO, 'index.html')
  if (fs.existsSync(indexRaiz)) {
    responderArquivo(res, indexRaiz)
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('dist-web não encontrada. Execute expo export primeiro.')
  }
})

servidor.listen(PORTA, () => {
  console.log(`[servidor-estatico] Servindo ${DIRETORIO} na porta ${PORTA}`)
})

export default servidor
