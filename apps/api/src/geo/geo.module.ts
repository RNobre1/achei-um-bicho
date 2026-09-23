import { Module } from '@nestjs/common'
import { GeoRepositorio } from './geo.repositorio'

@Module({ providers: [GeoRepositorio], exports: [GeoRepositorio] })
export class GeoModule {}
