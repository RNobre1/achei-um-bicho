import { Module } from '@nestjs/common'
import { CasosModule } from './casos/casos.module'
import { PrismaModule } from './prisma/prisma.module'
import { SaudeModule } from './saude/saude.module'

@Module({ imports: [PrismaModule, SaudeModule, CasosModule] })
export class AppModule {}
