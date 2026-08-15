import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import Category from '#models/category'
import User from '#models/user'
import Ticket from '#models/ticket'
import Comment from '#models/comment'
import TicketStatusHistory from '#models/ticket_status_history'
import SeedHistory from '#models/seed_history'

/**
 * Dados fictícios cobrindo as 4 combinações de status, as 3 prioridades e as
 * duas origens de classificação (IA aceita / corrigida manualmente), com
 * histórico de status e comentários para exercitar os endpoints de listagem,
 * filtro e indicadores.
 */
export default class TicketSeeder extends BaseSeeder {
  async run() {
    const seederName = 'ticket_seeder'
    const alreadyExists = await SeedHistory.findBy('seeder_name', seederName)

    if (alreadyExists) {
      console.log(`${seederName} já executado anteriormente`)
      return
    }

    const admin = await User.findByOrFail('email', 'admin@example.com')
    const admin2 = await User.findByOrFail('email', 'admin2@example.com')
    const requester1 = await User.findByOrFail('email', 'solicitante1@example.com')
    const requester2 = await User.findByOrFail('email', 'solicitante2@example.com')
    const requester3 = await User.findByOrFail('email', 'solicitante3@example.com')

    const networkCategory = await Category.findByOrFail('name', 'Rede')
    const hardwareCategory = await Category.findByOrFail('name', 'Hardware')
    const softwareCategory = await Category.findByOrFail('name', 'Software')
    const accessCategory = await Category.findByOrFail('name', 'Acesso')
    const otherCategory = await Category.findByOrFail('name', 'Outros')

    const now = DateTime.now()

    // Ticket A — aberto, sugestão da IA aceita como está
    const ticketA = await Ticket.create({
      title: 'Sem acesso à internet no setor financeiro',
      description:
        'Desde hoje de manhã os computadores do setor financeiro não conseguem acessar a internet nem a rede interna.',
      categoryId: networkCategory.id,
      suggestedCategoryId: networkCategory.id,
      priority: 'HIGH',
      suggestedPriority: 'HIGH',
      classificationOrigin: 'AI',
      status: 'OPEN',
      requesterId: requester1.id,
      assigneeId: null,
      createdAt: now.minus({ hours: 3 }),
    })
    await TicketStatusHistory.create({
      ticketId: ticketA.id,
      changedById: requester1.id,
      previousStatus: null,
      newStatus: 'OPEN',
      createdAt: now.minus({ hours: 3 }),
    })
    await Comment.createMany([
      {
        ticketId: ticketA.id,
        authorId: requester1.id,
        content: 'Já reiniciamos o roteador e o problema continua.',
        createdAt: now.minus({ hours: 2, minutes: 45 }),
      },
      {
        ticketId: ticketA.id,
        authorId: requester3.id,
        content: 'Aqui no meu computador também não consigo conectar à rede interna.',
        createdAt: now.minus({ hours: 2, minutes: 30 }),
      },
      {
        ticketId: ticketA.id,
        authorId: admin2.id,
        content: 'Estamos verificando com o provedor de internet, aguardem novidades.',
        createdAt: now.minus({ hours: 2 }),
      },
    ])

    // Ticket B — em andamento, ADMIN corrigiu a sugestão da IA
    const ticketB = await Ticket.create({
      title: 'Planilha de relatório não abre',
      description:
        'O arquivo de relatório mensal está corrompido e não abre em nenhum computador do setor.',
      categoryId: softwareCategory.id,
      suggestedCategoryId: otherCategory.id,
      priority: 'MEDIUM',
      suggestedPriority: 'LOW',
      classificationOrigin: 'MANUAL',
      status: 'IN_PROGRESS',
      requesterId: requester2.id,
      assigneeId: admin.id,
      createdAt: now.minus({ days: 1 }),
    })
    await TicketStatusHistory.createMany([
      {
        ticketId: ticketB.id,
        changedById: requester2.id,
        previousStatus: null,
        newStatus: 'OPEN',
        createdAt: now.minus({ days: 1 }),
      },
      {
        ticketId: ticketB.id,
        changedById: admin.id,
        previousStatus: 'OPEN',
        newStatus: 'IN_PROGRESS',
        createdAt: now.minus({ hours: 20 }),
      },
    ])
    await Comment.createMany([
      {
        ticketId: ticketB.id,
        authorId: requester2.id,
        content: 'O arquivo está na pasta compartilhada \\\\rede\\relatorios.',
        createdAt: now.minus({ days: 1 }).plus({ minutes: 10 }),
      },
      {
        ticketId: ticketB.id,
        authorId: admin.id,
        content: 'Recebido, é um problema de compatibilidade — estou verificando.',
        createdAt: now.minus({ hours: 19 }),
      },
      {
        ticketId: ticketB.id,
        authorId: admin.id,
        content: 'Consegui recuperar uma cópia de backup, vou reenviar em instantes.',
        createdAt: now.minus({ hours: 5 }),
      },
      {
        ticketId: ticketB.id,
        authorId: requester2.id,
        content: 'Perfeito, fico no aguardo do reenvio.',
        createdAt: now.minus({ hours: 4, minutes: 30 }),
      },
    ])

    // Ticket C — resolvido
    const ticketC = await Ticket.create({
      title: 'Impressora do RH não imprime',
      description: 'A impressora do setor de RH está ligada mas não imprime nenhum documento.',
      categoryId: hardwareCategory.id,
      suggestedCategoryId: hardwareCategory.id,
      priority: 'LOW',
      suggestedPriority: 'LOW',
      classificationOrigin: 'AI',
      status: 'RESOLVED',
      requesterId: requester1.id,
      assigneeId: admin.id,
      createdAt: now.minus({ days: 3 }),
    })
    await TicketStatusHistory.createMany([
      {
        ticketId: ticketC.id,
        changedById: requester1.id,
        previousStatus: null,
        newStatus: 'OPEN',
        createdAt: now.minus({ days: 3 }),
      },
      {
        ticketId: ticketC.id,
        changedById: admin.id,
        previousStatus: 'OPEN',
        newStatus: 'IN_PROGRESS',
        createdAt: now.minus({ days: 2, hours: 20 }),
      },
      {
        ticketId: ticketC.id,
        changedById: admin.id,
        previousStatus: 'IN_PROGRESS',
        newStatus: 'RESOLVED',
        createdAt: now.minus({ days: 2 }),
      },
    ])
    await Comment.createMany([
      {
        ticketId: ticketC.id,
        authorId: admin.id,
        content: 'Cabo USB estava solto. Reconectado e teste de impressão concluído com sucesso.',
        createdAt: now.minus({ days: 2 }),
      },
      {
        ticketId: ticketC.id,
        authorId: requester1.id,
        content: 'Muito obrigado, já testei aqui e está funcionando perfeitamente.',
        createdAt: now.minus({ days: 2 }).plus({ minutes: 20 }),
      },
    ])

    // Ticket D — fechado, ciclo completo
    const ticketD = await Ticket.create({
      title: 'Solicitação de acesso ao sistema financeiro',
      description: 'Preciso de acesso ao módulo financeiro para conferência de notas fiscais.',
      categoryId: accessCategory.id,
      suggestedCategoryId: accessCategory.id,
      priority: 'HIGH',
      suggestedPriority: 'HIGH',
      classificationOrigin: 'AI',
      status: 'CLOSED',
      requesterId: requester2.id,
      assigneeId: admin.id,
      createdAt: now.minus({ days: 5 }),
    })
    await TicketStatusHistory.createMany([
      {
        ticketId: ticketD.id,
        changedById: requester2.id,
        previousStatus: null,
        newStatus: 'OPEN',
        createdAt: now.minus({ days: 5 }),
      },
      {
        ticketId: ticketD.id,
        changedById: admin.id,
        previousStatus: 'OPEN',
        newStatus: 'IN_PROGRESS',
        createdAt: now.minus({ days: 4, hours: 20 }),
      },
      {
        ticketId: ticketD.id,
        changedById: admin.id,
        previousStatus: 'IN_PROGRESS',
        newStatus: 'RESOLVED',
        createdAt: now.minus({ days: 4 }),
      },
      {
        ticketId: ticketD.id,
        changedById: requester2.id,
        previousStatus: 'RESOLVED',
        newStatus: 'CLOSED',
        createdAt: now.minus({ days: 3, hours: 12 }),
      },
    ])
    await Comment.createMany([
      {
        ticketId: ticketD.id,
        authorId: admin.id,
        content: 'Acesso liberado com o perfil de consulta financeira.',
        createdAt: now.minus({ days: 4 }),
      },
      {
        ticketId: ticketD.id,
        authorId: requester2.id,
        content: 'Consegui acessar normalmente, obrigado!',
        createdAt: now.minus({ days: 3, hours: 12 }),
      },
      {
        ticketId: ticketD.id,
        authorId: admin2.id,
        content: 'Revisão de segurança: acesso concedido está de acordo com a política vigente.',
        createdAt: now.minus({ days: 3, hours: 10 }),
      },
    ])

    await SeedHistory.create({ seeder_name: seederName })
    console.log('Tickets seeded successfully!')
  }
}
