import z from 'zod'
import { BaseValidator } from './base_validator.js'
import { helpdeskEmailSchema } from './rules/helpdesk_email.js'

type UserValidatorShape = {
  name: z.ZodString
  email: typeof helpdeskEmailSchema
  password: z.ZodString
  role: z.ZodEnum<['ADMIN', 'REQUESTER']>
}

export default class UserValidator extends BaseValidator<UserValidatorShape> {
  protected schema: UserValidatorShape = {
    name: z.string({ message: 'O nome é obrigatório' }).min(2, 'Deve ter no mínimo 2 caracteres'),
    email: helpdeskEmailSchema,
    password: z
      .string({ message: 'A senha é obrigatória' })
      .min(8, 'A senha deve ter no mínimo 8 caracteres'),
    role: z.enum(['ADMIN', 'REQUESTER'], { message: 'Papel inválido' }),
  }
}
