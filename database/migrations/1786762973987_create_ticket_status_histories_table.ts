import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ticket_status_histories'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('ticket_id').references('id').inTable('tickets').notNullable()
      table.integer('changed_by_id').references('id').inTable('users').notNullable()

      // Tipo "ticket_status" já foi criado pela migration de tickets — só reutiliza.
      table.enum('previous_status', ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], {
        useNative: true,
        enumName: 'ticket_status',
        existingType: true,
      })
      table
        .enum('new_status', ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], {
          useNative: true,
          enumName: 'ticket_status',
          existingType: true,
        })
        .notNullable()

      // Registro imutável: só created_at (sem updated_at/deleted_at)
      table.timestamp('created_at').defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
