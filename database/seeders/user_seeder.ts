import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import SeedHistory from '#models/seed_history'

/**
 * ---- Credenciais de teste (ver README) ----
 * ADMIN: admin@example.com / password123
 * ADMIN: admin2@example.com / password123
 * REQUESTER: solicitante1@example.com / password123
 * REQUESTER: solicitante2@example.com / password123
 * REQUESTER: solicitante3@example.com / password123
 * REQUESTER: solicitante4@example.com / password123
 * REQUESTER: solicitante5@example.com / password123
 *
 * A senha é passada em texto puro aqui — o hook `@beforeSave` do model
 * `User` (app/models/user.ts) hasheia automaticamente.
 */
export default class UserSeeder extends BaseSeeder {
  async run() {
    const seederName = 'user_seeder'
    const alreadyExists = await SeedHistory.findBy('seeder_name', seederName)

    if (alreadyExists) {
      console.log(`${seederName} já executado anteriormente`)
      return
    }

    await User.createMany([
      { name: 'Admin Teste', email: 'admin@example.com', password: 'password123', role: 'ADMIN' },
      { name: 'Admin Dois', email: 'admin2@example.com', password: 'password123', role: 'ADMIN' },
      {
        name: 'Solicitante Um',
        email: 'solicitante1@example.com',
        password: 'password123',
        role: 'REQUESTER',
      },
      {
        name: 'Solicitante Dois',
        email: 'solicitante2@example.com',
        password: 'password123',
        role: 'REQUESTER',
      },
      {
        name: 'Solicitante Três',
        email: 'solicitante3@example.com',
        password: 'password123',
        role: 'REQUESTER',
      },
      {
        name: 'Solicitante Quatro',
        email: 'solicitante4@example.com',
        password: 'password123',
        role: 'REQUESTER',
      },
      {
        name: 'Solicitante Cinco',
        email: 'solicitante5@example.com',
        password: 'password123',
        role: 'REQUESTER',
      },
    ])

    await SeedHistory.create({ seeder_name: seederName })
    console.log('Usuários seeded successfully!')
  }
}
