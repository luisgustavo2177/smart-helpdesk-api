import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Ticket from '#models/ticket'
import User from '#models/user'

/**
 * Interação/comentário de um ticket. Registro imutável — sem updatedAt/soft delete.
 */
export default class Comment extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare ticketId: number

  @column()
  declare authorId: number

  @column()
  declare content: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Ticket, { foreignKey: 'ticketId' })
  declare ticket: BelongsTo<typeof Ticket>

  @belongsTo(() => User, { foreignKey: 'authorId' })
  declare author: BelongsTo<typeof User>
}
