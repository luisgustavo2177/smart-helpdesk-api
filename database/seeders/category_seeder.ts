import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Category from '#models/category'
import SeedHistory from '#models/seed_history'

export default class CategorySeeder extends BaseSeeder {
  async run() {
    const seederName = 'category_seeder'
    const alreadyExists = await SeedHistory.findBy('seeder_name', seederName)

    if (alreadyExists) {
      console.log(`${seederName} já executado anteriormente`)
      return
    }

    await Category.createMany([
      { name: 'Rede', status: true },
      { name: 'Hardware', status: true },
      { name: 'Software', status: true },
      { name: 'Acesso', status: true },
      { name: 'Outros', status: true },
    ])

    await SeedHistory.create({ seeder_name: seederName })
    console.log('Categorias seeded successfully!')
  }
}
