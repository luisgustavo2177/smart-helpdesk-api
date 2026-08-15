import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'comments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('ticket_id').references('id').inTable('tickets').notNullable()
      table.integer('author_id').references('id').inTable('users').notNullable()
      table.text('content').notNullable()

      // Registro imutável: só created_at (sem updated_at/deleted_at)
      table.timestamp('created_at').defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
