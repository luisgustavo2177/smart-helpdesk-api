import { BasePolicy } from '@adonisjs/bouncer'
import User from '#models/user'
import Ticket from '#models/ticket'

/**
 * ADMIN acessa/gerencia qualquer chamado. REQUESTER só o próprio chamado
 * (como solicitante) — listagem geral (ADMIN vê todos) é filtrada em
 * `TicketService.index`, não aqui, por ser um escopo de consulta.
 */
export default class TicketPolicy extends BasePolicy {
  view(actingUser: User, ticket: Ticket): boolean {
    return (
      actingUser.role === 'ADMIN' ||
      ticket.requesterId === actingUser.id ||
      ticket.assigneeId === actingUser.id
    )
  }

  update(actingUser: User, ticket: Ticket): boolean {
    return actingUser.role === 'ADMIN' || ticket.requesterId === actingUser.id
  }

  delete(actingUser: User, ticket: Ticket): boolean {
    return actingUser.role === 'ADMIN' || ticket.requesterId === actingUser.id
  }
}
