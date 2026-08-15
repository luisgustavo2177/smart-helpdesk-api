import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  disableTransactions = true

  async up() {
    await this.db.rawQuery(`CREATE EXTENSION IF NOT EXISTS pg_trgm`)
    await this.db.rawQuery(`CREATE EXTENSION IF NOT EXISTS unaccent`)

    await this.db.rawQuery(`
      CREATE OR REPLACE FUNCTION unaccent_immutable(text)
      RETURNS text AS $$
        SELECT unaccent($1)
      $$ LANGUAGE sql IMMUTABLE PARALLEL SAFE
    `)
  }

  async down() {
    await this.db.rawQuery(`DROP FUNCTION IF EXISTS unaccent_immutable(text)`)
  }
}
