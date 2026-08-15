import { column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { BaseModel } from '#models/base_model'
import Ticket from '#models/ticket'

export default class Category extends BaseModel {
  static entityName = 'Categoria'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  /** Indica se a categoria está ativa e pode ser listada na seleção. */
  @column()
  declare status: boolean

  @hasMany(() => Ticket, { foreignKey: 'categoryId' })
  declare tickets: HasMany<typeof Ticket>

  @hasMany(() => Ticket, { foreignKey: 'suggestedCategoryId' })
  declare suggestedTickets: HasMany<typeof Ticket>
}
