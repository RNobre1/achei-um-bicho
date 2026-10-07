import { CABECALHO_CODIGO_EDICAO, CAMPO_FOTO, FOTO, type FotoEnviada } from '@achei/contratos'
import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'
import { ArmazenamentoDeFotos, NOME_DE_FOTO } from './armazenamento-de-fotos'
import { FotosService } from './fotos.service'

/** O que o interceptor de upload entrega; só o conteúdo interessa. */
interface ArquivoRecebido {
  buffer: Buffer
}

@Controller()
export class FotosController {
  constructor(
    private readonly fotos: FotosService,
    private readonly armazenamento: ArmazenamentoDeFotos,
  ) {}

  @Post('casos/:id/fotos')
  // acima do limite o multer corta o envio e a API responde 413
  @UseInterceptors(FileInterceptor(CAMPO_FOTO, { limits: { fileSize: FOTO.maximoBytes, files: 1 } }))
  enviar(
    @Param('id', new ParseUUIDPipe()) casoId: string,
    @Headers(CABECALHO_CODIGO_EDICAO) codigo: string | undefined,
    @UploadedFile() arquivo: ArquivoRecebido | undefined,
  ): Promise<FotoEnviada> {
    return this.fotos.enviar(casoId, codigo, arquivo?.buffer)
  }

  @Get('fotos/:arquivo')
  async servir(@Param('arquivo') arquivo: string, @Res() resposta: Response): Promise<void> {
    if (!NOME_DE_FOTO.test(arquivo)) throw new NotFoundException()
    const conteudo = await this.armazenamento.ler(arquivo)
    if (!conteudo) throw new NotFoundException()
    // o nome é o id da foto, que nunca muda de conteúdo
    resposta.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    resposta.type('image/jpeg').send(conteudo)
  }
}
