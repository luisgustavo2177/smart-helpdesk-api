import z from 'zod'
import { BaseValidator } from './base_validator.js'

type TicketValidatorShape = {
  title: z.ZodString
  description: z.ZodString
  categoryId: z.ZodOptional<z.ZodNumber>
  priority: z.ZodOptional<z.ZodEnum<['LOW', 'MEDIUM', 'HIGH']>>
  assigneeId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>
  status: z.ZodOptional<z.ZodEnum<['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']>>
}

/**
 * `categoryId`/`priority` ficam opcionais aqui porque a triagem automática
 * (IA/heurística) pode preenchê-los quando o solicitante não informa —
 * `classificationOrigin`/`suggestedCategoryId`/`suggestedPriority` são
 * calculados pelo service, não vêm do corpo da requisição.
 */
export default class TicketValidator extends BaseValidator<TicketValidatorShape> {
  protected schema: TicketValidatorShape = {
    title: z
      .string({ message: 'O título é obrigatório' })
      .min(3, 'Deve ter no mínimo 3 caracteres'),
    description: z
      .string({ message: 'A descrição é obrigatória' })
      .min(10, 'Descreva o problema com mais detalhes'),
    categoryId: z.number().int().positive().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    assigneeId: z.number().int().positive().nullable().optional(),
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  }
}
