import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tickets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('title').notNullable()
      table.text('description').notNullable()

      table.integer('category_id').references('id').inTable('categories').notNullable()
      table.integer('suggested_category_id').references('id').inTable('categories')

      table
        .enum('priority', ['LOW', 'MEDIUM', 'HIGH'], {
          useNative: true,
          enumName: 'ticket_priority',
        })
        .notNullable()
      table.enum('suggested_priority', ['LOW', 'MEDIUM', 'HIGH'], {
        useNative: true,
        enumName: 'ticket_priority',
        existingType: true,
      })

      table
        .enum('classification_origin', ['AI', 'MANUAL'], {
          useNative: true,
          enumName: 'ticket_classification_origin',
        })
        .notNullable()

      table
        .enum('status', ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], {
          useNative: true,
          enumName: 'ticket_status',
        })
        .notNullable()
        .defaultTo('OPEN')

      table.integer('requester_id').references('id').inTable('users').notNullable()
      table.integer('assignee_id').references('id').inTable('users')

      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at').defaultTo(this.now())
      table.timestamp('deleted_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    // Os tipos nativos são criados por esta migration (a primeira a usá-los),
    // então o drop também fica aqui — depois que as tabelas que os referenciam
    // (tickets, ticket_status_histories) já tiverem sido removidas.
    this.schema.raw('DROP TYPE IF EXISTS "ticket_priority"')
    this.schema.raw('DROP TYPE IF EXISTS "ticket_classification_origin"')
    this.schema.raw('DROP TYPE IF EXISTS "ticket_status"')
  }
}
