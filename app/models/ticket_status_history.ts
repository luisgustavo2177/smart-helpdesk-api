import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Ticket from '#models/ticket'
import User from '#models/user'

/**
 * Trilha de auditoria de mudanças de status de um ticket. Registro imutável —
 * sem updatedAt/soft delete. `previousStatus` é nulo no evento de abertura.
 */
export default class TicketStatusHistory extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare ticketId: number

  @column()
  declare changedById: number

  @column()
  declare previousStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | null

  @column()
  declare newStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Ticket, { foreignKey: 'ticketId' })
  declare ticket: BelongsTo<typeof Ticket>

  @belongsTo(() => User, { foreignKey: 'changedById' })
  declare changedBy: BelongsTo<typeof User>
}
