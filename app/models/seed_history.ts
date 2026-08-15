import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class SeedHistory extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare seeder_name: string

  @column()
  declare created_at: DateTime
}
