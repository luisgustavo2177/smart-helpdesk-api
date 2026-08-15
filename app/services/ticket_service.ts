import Ticket from '#models/ticket'
import TicketStatusHistory from '#models/ticket_status_history'
import TicketValidator from '#validators/ticket_validator'
import { TicketTriageService } from '#services/ticket_triage_service'
import { AppError } from '#error/app_error'
import {
  BaseService,
  type IndexProps,
  type PreloadConfig,
  type ShowServiceProps,
  type StoreServiceProps,
  type UpdateServiceProps,
} from './base_service.js'

export default class TicketService extends BaseService<typeof Ticket, TicketValidator> {
  protected defaultOrder = '-createdAt'

  protected indexPreloads: PreloadConfig[] = [
    { relation: 'category', fields: ['id', 'name'] },
    { relation: 'requester', fields: ['id', 'name', 'email'] },
    { relation: 'assignee', fields: ['id', 'name', 'email'] },
  ]

  constructor() {
    super(Ticket, new TicketValidator())
  }

  /**
   * SOLICITANTE só enxerga os próprios chamados na listagem — ADMIN enxerga
   * todos. A restrição é aplicada aqui (não na policy) porque é um filtro de
   * escopo da consulta, não uma negação binária de acesso.
   */
  async index({ page, limit, filters, order, search, ctx }: IndexProps<typeof Ticket>) {
    const scopedFilters =
      ctx?.user && ctx.user.role !== 'ADMIN' ? { ...filters, requesterId: ctx.user.id } : filters

    return super.index({ page, limit, filters: scopedFilters, order, search, ctx })
  }

  /** Detalhe do chamado já vem com o histórico completo (comentários + mudanças de status). */
  async show({ id, transaction }: ShowServiceProps) {
    const ticket = await this.model
      .query({ client: transaction })
      .where('id', id)
      .preload('category')
      .preload('suggestedCategory')
      .preload('requester', (q) => q.select(['id', 'name', 'email']))
      .preload('assignee', (q) => q.select(['id', 'name', 'email']))
      .preload('comments', (q) => {
        q.orderBy('createdAt', 'asc').preload('author', (a) => a.select(['id', 'name', 'email']))
      })
      .preload('statusHistories', (q) => {
        q.orderBy('createdAt', 'asc').preload('changedBy', (a) => a.select(['id', 'name', 'email']))
      })
      .first()

    if (!ticket) {
      throw new AppError({
        messages: [`${this.getEntityName()} não encontrado(a)`],
        statusCode: 404,
      })
    }

    return ticket
  }

  /**
   * Cria o chamado já rodando a triagem automática (heurística) sobre a
   * descrição. Se o cliente não informar `categoryId`/`priority`, o valor
   * final é a sugestão da IA (`classificationOrigin: 'AI'`); se informar,
   * assume-se correção manual (`classificationOrigin: 'MANUAL'`) — a
   * sugestão da IA continua registrada em `suggestedCategoryId`/
   * `suggestedPriority` para auditoria.
   */
  async store({ data, transaction, ctx }: StoreServiceProps<typeof Ticket>) {
    if (!ctx?.user) {
      throw new AppError({
        messages: ['Usuário autenticado é obrigatório para abrir um chamado.'],
        statusCode: 401,
      })
    }

    const validated = this.validator.validateCreate(data)
    const suggestion = await TicketTriageService.classify(validated.description)

    const ticket = new Ticket()
    ticket.merge({
      title: validated.title,
      description: validated.description,
      categoryId: validated.categoryId ?? suggestion.categoryId,
      suggestedCategoryId: suggestion.categoryId,
      priority: validated.priority ?? suggestion.priority,
      suggestedPriority: suggestion.priority,
      classificationOrigin: validated.categoryId || validated.priority ? 'MANUAL' : 'AI',
      status: 'OPEN',
      requesterId: ctx.user.id,
      assigneeId: validated.assigneeId ?? null,
    })

    if (transaction) ticket.useTransaction(transaction)
    await ticket.save()

    await TicketStatusHistory.create({
      ticketId: ticket.id,
      changedById: ctx.user.id,
      previousStatus: null,
      newStatus: 'OPEN',
    })

    return ticket
  }

  /**
   * Corrige/atualiza o chamado. Mudança de status vira um registro em
   * `ticket_status_histories`; não é permitido reabrir chamado fechado
   * (regra de negócio do enunciado).
   */
  async update({ id, data, transaction, ctx }: UpdateServiceProps<typeof Ticket>) {
    const ticket = await this.model.find(id, { client: transaction })
    if (!ticket) {
      throw new AppError({
        messages: [`${this.getEntityName()} não encontrado(a)`],
        statusCode: 404,
      })
    }

    const validated = this.validator.validateUpdate(data)

    if (validated.status && validated.status !== ticket.status && ticket.status === 'CLOSED') {
      throw new AppError({
        messages: ['Não é permitido reabrir um chamado fechado.'],
        statusCode: 422,
      })
    }

    const previousStatus = ticket.status
    const dataToMerge: Record<string, unknown> = { ...validated }

    if (validated.categoryId !== undefined || validated.priority !== undefined) {
      dataToMerge.classificationOrigin = 'MANUAL'
    }

    ticket.merge(dataToMerge)
    if (transaction) ticket.useTransaction(transaction)
    await ticket.save()

    if (validated.status && validated.status !== previousStatus && ctx?.user) {
      await TicketStatusHistory.create({
        ticketId: ticket.id,
        changedById: ctx.user.id,
        previousStatus,
        newStatus: validated.status,
      })
    }

    return ticket
  }
}
