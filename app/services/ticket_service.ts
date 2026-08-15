import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Ticket from '#models/ticket'
import TicketStatusHistory from '#models/ticket_status_history'
import TicketValidator from '#validators/ticket_validator'
import { TicketTriageService } from '#services/ticket_triage_service'
import { AppError } from '#error/app_error'
import { buildTicketReportWorkbook } from '#services/ticket_report_builder'
import {
  BaseService,
  type IndexProps,
  type PreloadConfig,
  type RelationOrderConfig,
  type ShowServiceProps,
  type StoreServiceProps,
  type UpdateServiceProps,
} from './base_service.js'

const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const
const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const

export type TicketStatsProps = {
  filters?: Record<string, unknown>
  search?: string
  ctx?: HttpContext
}

export default class TicketService extends BaseService<typeof Ticket, TicketValidator> {
  protected defaultOrder = '-createdAt'

  protected indexPreloads: PreloadConfig[] = [
    { relation: 'category', fields: ['id', 'name'] },
    { relation: 'requester', fields: ['id', 'name', 'email'] },
    { relation: 'assignee', fields: ['id', 'name', 'email'] },
  ]

  /**
   * `category`/`requester`/`assignee` não são colunas do próprio ticket (só
   * os `*_id`), então ordenar a listagem por esses nomes exige um join com a
   * tabela relacionada. `leftJoin` em todos porque `assignee_id` é nulável —
   * `join` (inner) descartaria da listagem os chamados sem responsável.
   */
  protected relationOrderFields: RelationOrderConfig[] = [
    {
      field: 'category',
      table: 'categories',
      column: 'name',
      foreignKey: 'category_id',
      joinType: 'left',
    },
    {
      field: 'requester',
      table: 'users',
      column: 'name',
      foreignKey: 'requester_id',
      joinType: 'left',
    },
    {
      field: 'assignee',
      table: 'users',
      column: 'name',
      foreignKey: 'assignee_id',
      joinType: 'left',
    },
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

  /**
   * Contagem de chamados por status e por prioridade (com percentual sobre o
   * total), mais a lista dos chamados ALTA+ABERTO — respeitando os mesmos
   * filtros/busca/escopo por papel da listagem. É o snapshot usado tanto
   * pelos cards de resumo (estáticos, na primeira renderização) quanto pelo
   * indicador em tempo real do front, que faz *poll* nesse mesmo endpoint —
   * o front não recalcula nem soma nada sozinho.
   */
  async stats({ filters, search, ctx }: TicketStatsProps) {
    const scopedFilters =
      ctx?.user && ctx.user.role !== 'ADMIN' ? { ...filters, requesterId: ctx.user.id } : filters

    const query = this.model.query()
    this.applyFilters(query, scopedFilters as never)
    this.applySearch(query, search)

    // `.pojo()` faz o resultado pular a hidratação de model — e é por causa
    // dela que o hook `beforeFetch` do soft-delete (adonis-lucid-soft-deletes)
    // aplica o `whereNull('deleted_at')` normalmente. Sem esse hook, um
    // agregado via `.pojo()` contaria chamados cancelados. Refazendo aqui à mão.
    const rows = await query
      .whereNull('deleted_at')
      .select('status', 'priority')
      .count('* as count')
      .groupBy('status', 'priority')
      .pojo<{
        status: (typeof TICKET_STATUSES)[number]
        priority: (typeof TICKET_PRIORITIES)[number]
        count: string | number
      }>()

    const countsByStatus = new Map<string, number>()
    const countsByPriority = new Map<string, number>()
    let total = 0

    for (const row of rows) {
      const count = Number(row.count)
      total += count
      countsByStatus.set(row.status, (countsByStatus.get(row.status) ?? 0) + count)
      countsByPriority.set(row.priority, (countsByPriority.get(row.priority) ?? 0) + count)
    }

    const highPriorityOpenCount =
      rows.find((row) => row.status === 'OPEN' && row.priority === 'HIGH')?.count ?? 0

    const highPriorityOpenQuery = this.model.query()
    this.applyFilters(highPriorityOpenQuery, scopedFilters as never)
    const highPriorityOpenTickets = await highPriorityOpenQuery
      .whereNull('deleted_at')
      .where('status', 'OPEN')
      .where('priority', 'HIGH')
      .orderBy('created_at', 'desc')
      .limit(5)
      .select('id', 'title', 'created_at')
      .pojo<{ id: number; title: string; created_at: string }>()

    const percentageOf = (count: number) =>
      total > 0 ? Number(((count / total) * 100).toFixed(2)) : 0

    return {
      total,
      generatedAt: DateTime.now().toISO(),
      statuses: TICKET_STATUSES.map((status) => ({
        status,
        count: countsByStatus.get(status) ?? 0,
        percentage: percentageOf(countsByStatus.get(status) ?? 0),
      })),
      priorities: TICKET_PRIORITIES.map((priority) => ({
        priority,
        count: countsByPriority.get(priority) ?? 0,
        percentage: percentageOf(countsByPriority.get(priority) ?? 0),
      })),
      highPriorityOpen: {
        count: Number(highPriorityOpenCount),
        tickets: highPriorityOpenTickets.map((ticket) => ({
          id: ticket.id,
          title: ticket.title,
          createdAt: ticket.created_at,
        })),
      },
    }
  }

  /**
   * Gera o .xlsx do relatório: a aba de chamados respeita todos os filtros
   * ativos na tela (inclusive `status`, para exportar exatamente o que está
   * sendo visto), ordenados pela data de criação; a aba de resumo ignora o
   * filtro de `status` (mesma regra do `stats`), pois é a quebra por status.
   */
  async generateReport({ filters, search, ctx }: TicketStatsProps) {
    const scopedFilters =
      ctx?.user && ctx.user.role !== 'ADMIN' ? { ...filters, requesterId: ctx.user.id } : filters

    const query = this.model
      .query()
      .preload('category', (q) => q.select(['id', 'name']))
      .preload('requester', (q) => q.select(['id', 'name', 'email']))
      .preload('assignee', (q) => q.select(['id', 'name', 'email']))

    this.applyFilters(query, scopedFilters as never)
    this.applySearch(query, search)
    query.orderBy('created_at', 'asc')

    const tickets = await query.exec()

    const filtersWithoutStatus = { ...(filters ?? {}) } as Record<string, unknown>
    delete filtersWithoutStatus.status
    const stats = await this.stats({ filters: filtersWithoutStatus, search, ctx })

    return buildTicketReportWorkbook(tickets, stats)
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
