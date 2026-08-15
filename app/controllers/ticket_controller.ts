import type { HttpContext } from '@adonisjs/core/http'
import { ZodError } from 'zod'
import { AppError } from '#error/app_error'
import TicketService from '#services/ticket_service'
import { BaseController } from './base_controller.js'

/** Campos que só ADMIN pode alterar (reatribuir responsável, corrigir classificação, mudar status). */
const ADMIN_ONLY_FIELDS = ['status', 'assigneeId', 'categoryId', 'priority'] as const

export default class TicketController extends BaseController<TicketService> {
  constructor() {
    super(new TicketService())
  }

  async show(ctx: HttpContext) {
    const { request, response } = ctx
    try {
      const { id } = request.params()
      const target = await this.service.show({ id })

      if (await ctx.bouncer.with('TicketPolicy').denies('view', target)) {
        throw new AppError({
          messages: ['Você não tem permissão para ver este chamado.'],
          statusCode: 403,
        })
      }

      return response.status(200).json({ data: target })
    } catch (error) {
      if (error instanceof AppError) throw error
      return this.handleGenericError(error, response, 'buscar')
    }
  }

  async update(ctx: HttpContext) {
    const { request, response } = ctx
    try {
      const { id } = request.params()
      const target = await this.service.show({ id })

      if (await ctx.bouncer.with('TicketPolicy').denies('update', target)) {
        throw new AppError({
          messages: ['Você não tem permissão para atualizar este chamado.'],
          statusCode: 403,
        })
      }

      if (ctx.user?.role !== 'ADMIN') {
        const body = request.body()
        const hasRestrictedField = ADMIN_ONLY_FIELDS.some((field) => field in body)
        if (hasRestrictedField) {
          throw new AppError({
            messages: ['Apenas ADMIN pode alterar status, responsável, categoria ou prioridade.'],
            statusCode: 403,
          })
        }
      }

      return await super.update(ctx)
    } catch (error) {
      if (error instanceof AppError) throw error
      if (error instanceof ZodError) return this.handleZodError(error, response)
      return this.handleGenericError(error, response, 'atualizar')
    }
  }

  async destroy(ctx: HttpContext) {
    const { request, response } = ctx
    try {
      const { id } = request.params()
      const target = await this.service.show({ id })

      if (await ctx.bouncer.with('TicketPolicy').denies('delete', target)) {
        throw new AppError({
          messages: ['Você não tem permissão para cancelar este chamado.'],
          statusCode: 403,
        })
      }

      return await super.destroy(ctx)
    } catch (error) {
      if (error instanceof AppError) throw error
      return this.handleGenericError(error, response, 'deletar')
    }
  }
}
