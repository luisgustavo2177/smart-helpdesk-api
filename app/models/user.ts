import { column, hasMany, beforeSave } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import hash from '@adonisjs/core/services/hash'
import { BaseModel } from '#models/base_model'
import Ticket from '#models/ticket'
import Comment from '#models/comment'
import TicketStatusHistory from '#models/ticket_status_history'

export default class User extends BaseModel {
  static entityName = 'Usuário'

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

  @beforeSave()
  static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await hash.make(user.password)
    }
  }

  @hasMany(() => Ticket, { foreignKey: 'requesterId' })
  declare requestedTickets: HasMany<typeof Ticket>

  @hasMany(() => Ticket, { foreignKey: 'assigneeId' })
  declare assignedTickets: HasMany<typeof Ticket>

  @hasMany(() => Comment, { foreignKey: 'authorId' })
  declare comments: HasMany<typeof Comment>

  @hasMany(() => TicketStatusHistory, { foreignKey: 'changedById' })
  declare statusChanges: HasMany<typeof TicketStatusHistory>
}
