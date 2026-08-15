import z from 'zod'
import { BaseValidator } from './base_validator.js'

type CommentValidatorShape = {
  content: z.ZodString
}

/**
 * `ticketId` (rota) e `authorId` (usuário autenticado) não fazem parte do
 * corpo da requisição, por isso não entram neste schema.
 */
export default class CommentValidator extends BaseValidator<CommentValidatorShape> {
  protected schema: CommentValidatorShape = {
    content: z
      .string({ message: 'O comentário é obrigatório' })
      .min(1, 'O comentário não pode ser vazio'),
  }
}
