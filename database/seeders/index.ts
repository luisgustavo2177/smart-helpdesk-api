import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class MainSeeder extends BaseSeeder {
  private async runSeeder(seederPath: string, name: string): Promise<void> {
    try {
      const SeederClass = await import(seederPath)
      const seederInstance = new SeederClass.default()
      await seederInstance.run()

      console.log(`${name} executado com sucesso!`)
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Erro ao executar ${name}:`, error.message)
      }
      throw error
    }
  }

  async run(): Promise<void> {
    try {
      await this.runSeeder('./category_seeder.js', 'CategorySeeder')
      await this.runSeeder('./user_seeder.js', 'UserSeeder')
      await this.runSeeder('./ticket_seeder.js', 'TicketSeeder')

      console.log('Todos os seeders foram executados com sucesso!')
    } catch (error) {
      if (error instanceof Error) {
        console.error('Falha na execução dos seeders:', error.message)
      }
      throw error
    }
  }
}
