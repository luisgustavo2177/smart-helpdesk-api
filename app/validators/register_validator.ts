import z from 'zod'
import { BaseValidator } from './base_validator.js'
import { helpdeskEmailSchema } from './rules/helpdesk_email.js'

type RegisterValidatorShape = {
  name: z.ZodString
  email: typeof helpdeskEmailSchema
  password: z.ZodString
}

/**
 * Sem campo `role` de propósito: o cadastro público sempre cria um usuário
 * REQUESTER (ver AuthController.register) — só ADMIN pode criar outro ADMIN,
 * pela tela de gestão de usuários.
 */
export default class RegisterValidator extends BaseValidator<RegisterValidatorShape> {
  protected schema: RegisterValidatorShape = {
    name: z.string({ message: 'O nome é obrigatório' }).min(2, 'Deve ter no mínimo 2 caracteres'),
    email: helpdeskEmailSchema,
    password: z
      .string({ message: 'A senha é obrigatória' })
      .min(8, 'A senha deve ter no mínimo 8 caracteres'),
  }
}
