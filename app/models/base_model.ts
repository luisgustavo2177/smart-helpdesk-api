import { compose } from '@adonisjs/core/helpers'
import { beforeCreate, BaseModel as LucideBaseModel, column } from '@adonisjs/lucid/orm'
import { SoftDeletes } from 'adonis-lucid-soft-deletes'
import { v4 as uuidV4 } from 'uuid'
import { DateTime } from 'luxon'

export class BaseModel extends compose(LucideBaseModel, SoftDeletes) {
  static entityName: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare deletedAt: DateTime | null

  @beforeCreate()
  static assignUuid<T extends { uuid?: string }>(model: T) {
    if (!model.uuid) {
      model.uuid = uuidV4()
    }
  }
}
