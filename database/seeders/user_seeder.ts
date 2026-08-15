import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import SeedHistory from '#models/seed_history'

/**
 * ---- Credenciais de teste (ver README) ----
 * ADMIN: admin@helpdesk.com / password123
 * ADMIN: admin2@helpdesk.com / password123
 * REQUESTER: solicitante1@helpdesk.com / password123
 * REQUESTER: solicitante2@helpdesk.com / password123
 * REQUESTER: solicitante3@helpdesk.com / password123
 * REQUESTER: solicitante4@helpdesk.com / password123
 * REQUESTER: solicitante5@helpdesk.com / password123
 *
 * Domínio `@helpdesk.com` porque é o único aceito pelo validador de e-mail
 * (`app/validators/rules/helpdesk_email.ts`) — os dados de seed precisam
 * respeitar a mesma regra de negócio que vale pra criação de usuário.
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
      {
        name: 'Admin Teste',
        email: 'admin@helpdesk.com',
        password: 'password123',
        role: 'ADMIN',
      },
      {
        name: 'Admin Dois',
        email: 'admin2@helpdesk.com',
        password: 'password123',
        role: 'ADMIN',
      },
      {
        name: 'Solicitante Um',
        email: 'solicitante1@helpdesk.com',
        password: 'password123',
        role: 'REQUESTER',
      },
      {
        name: 'Solicitante Dois',
        email: 'solicitante2@helpdesk.com',
        password: 'password123',
        role: 'REQUESTER',
      },
      {
        name: 'Solicitante Três',
        email: 'solicitante3@helpdesk.com',
        password: 'password123',
        role: 'REQUESTER',
      },
      {
        name: 'Solicitante Quatro',
        email: 'solicitante4@helpdesk.com',
        password: 'password123',
        role: 'REQUESTER',
      },
      {
        name: 'Solicitante Cinco',
        email: 'solicitante5@helpdesk.com',
        password: 'password123',
        role: 'REQUESTER',
      },
    ])

    await SeedHistory.create({ seeder_name: seederName })
    console.log('Usuários seeded successfully!')
  }
}
