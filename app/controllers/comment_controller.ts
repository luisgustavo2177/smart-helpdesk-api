import type { HttpContext } from '@adonisjs/core/http'
import { ZodError } from 'zod'
import { AppError } from '#error/app_error'
import Ticket from '#models/ticket'
import CommentService from '#services/comment_service'

/**
 * Aninhado em `/tickets/:ticketId/comments`. Não estende `BaseController`
 * (comentário não tem show/update/destroy) — só index/store, sempre
 * checando se o usuário pode ver o chamado pai (mesma regra de visibilidade
 * do `TicketPolicy.view`).
 */
export default class CommentController {
  private service = new CommentService()

  private async findTicketOrFail(ctx: HttpContext): Promise<Ticket> {
    const { ticketId } = ctx.request.params()
    const ticket = await Ticket.find(ticketId)

    if (!ticket) {
      throw new AppError({ messages: ['Chamado não encontrado(a)'], statusCode: 404 })
    }

    if (await ctx.bouncer.with('TicketPolicy').denies('view', ticket)) {
      throw new AppError({
        messages: ['Você não tem permissão para ver os comentários deste chamado.'],
        statusCode: 403,
      })
    }

    return ticket
  }

  async index(ctx: HttpContext) {
    const { response } = ctx
    try {
      const ticket = await this.findTicketOrFail(ctx)
      const comments = await this.service.listByTicket(ticket.id)
      return response.status(200).json({ data: comments })
    } catch (error) {
      if (error instanceof AppError) throw error
      console.error('Erro ao listar comentários:', error)
      return response.status(500).json({ messages: ['Erro ao listar comentários'], status: 500 })
    }
  }

  async store(ctx: HttpContext) {
    const { request, response } = ctx
    try {
      const ticket = await this.findTicketOrFail(ctx)
      const comment = await this.service.create(ticket.id, ctx.user!.id, request.body())

      return response
        .status(201)
        .json({ data: comment, message: 'Comentário adicionado com sucesso' })
    } catch (error) {
      if (error instanceof AppError) throw error
      if (error instanceof ZodError) {
        return response.status(422).json({
          messages: error.errors.map((err) => err.message),
          status: 422,
        })
      }
      console.error('Erro ao criar comentário:', error)
      return response.status(500).json({ messages: ['Erro ao criar comentário'], status: 500 })
    }
  }
}
