import { column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { BaseModel } from '#models/base_model'
import User from '#models/user'
import Category from '#models/category'
import Comment from '#models/comment'
import TicketStatusHistory from '#models/ticket_status_history'

export default class Ticket extends BaseModel {
  static entityName = 'Chamado'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column()
  declare description: string

  @column()
  declare categoryId: number

  @column()
  declare suggestedCategoryId: number | null

  @column()
  declare priority: 'LOW' | 'MEDIUM' | 'HIGH'

  @column()
  declare suggestedPriority: 'LOW' | 'MEDIUM' | 'HIGH' | null

  @column()
  declare classificationOrigin: 'AI' | 'MANUAL'

  @column()
  declare status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

  @column()
  declare requesterId: number

  @column()
  declare assigneeId: number | null

  @belongsTo(() => Category, { foreignKey: 'categoryId' })
  declare category: BelongsTo<typeof Category>

  @belongsTo(() => Category, { foreignKey: 'suggestedCategoryId' })
  declare suggestedCategory: BelongsTo<typeof Category>

  @belongsTo(() => User, { foreignKey: 'requesterId' })
  declare requester: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'assigneeId' })
  declare assignee: BelongsTo<typeof User>

  @hasMany(() => Comment, { foreignKey: 'ticketId' })
  declare comments: HasMany<typeof Comment>

  @hasMany(() => TicketStatusHistory, { foreignKey: 'ticketId' })
  declare statusHistories: HasMany<typeof TicketStatusHistory>
}
