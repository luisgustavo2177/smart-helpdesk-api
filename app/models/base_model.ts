import { compose } from '@adonisjs/core/helpers'
import { BaseModel as LucideBaseModel, column } from '@adonisjs/lucid/orm'
import { SoftDeletes } from 'adonis-lucid-soft-deletes'
import { DateTime } from 'luxon'

export class BaseModel extends compose(LucideBaseModel, SoftDeletes) {
  static entityName: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare deletedAt: DateTime | null
}
