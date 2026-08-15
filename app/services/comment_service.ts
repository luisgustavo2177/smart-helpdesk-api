import Comment from '#models/comment'
import CommentValidator from '#validators/comment_validator'

/**
 * Não estende `BaseService`: comentário é um registro imutável (sem
 * update/destroy/soft delete), então o CRUD genérico não se aplica — só
 * listar (ordem cronológica) e criar.
 */
export default class CommentService {
  private validator = new CommentValidator()

  async listByTicket(ticketId: number) {
    return Comment.query()
      .where('ticketId', ticketId)
      .orderBy('createdAt', 'asc')
      .preload('author', (q) => q.select(['id', 'name', 'email']))
  }

  async create(ticketId: number, authorId: number, data: unknown) {
    const validated = this.validator.validateCreate(data)

    return Comment.create({
      ticketId,
      authorId,
      content: validated.content,
    })
  }
}
