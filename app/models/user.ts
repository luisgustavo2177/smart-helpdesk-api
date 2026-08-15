import { column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { BaseModel } from '#models/base_model'
import Ticket from '#models/ticket'
import Comment from '#models/comment'
import TicketStatusHistory from '#models/ticket_status_history'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare role: 'ADMIN' | 'REQUESTER'

  @hasMany(() => Ticket, { foreignKey: 'requesterId' })
  declare requestedTickets: HasMany<typeof Ticket>

  @hasMany(() => Ticket, { foreignKey: 'assigneeId' })
  declare assignedTickets: HasMany<typeof Ticket>

  @hasMany(() => Comment, { foreignKey: 'authorId' })
  declare comments: HasMany<typeof Comment>

  @hasMany(() => TicketStatusHistory, { foreignKey: 'changedById' })
  declare statusChanges: HasMany<typeof TicketStatusHistory>
}
