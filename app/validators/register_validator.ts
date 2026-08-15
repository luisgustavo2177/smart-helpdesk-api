import z from 'zod'
import { BaseValidator } from './base_validator.js'

type RegisterValidatorShape = {
  name: z.ZodString
  email: z.ZodString
  password: z.ZodString
}

/**
 * Sem campo `role` de propósito: o cadastro público sempre cria um usuário
 * REQUESTER (ver AuthController.register) — só ADMIN pode existir via seed
 * ou uma futura tela de gestão de usuários.
 */
export default class RegisterValidator extends BaseValidator<RegisterValidatorShape> {
  protected schema: RegisterValidatorShape = {
    name: z.string({ message: 'O nome é obrigatório' }).min(2, 'Deve ter no mínimo 2 caracteres'),
    email: z.string({ message: 'O e-mail é obrigatório' }).email('E-mail inválido'),
    password: z
      .string({ message: 'A senha é obrigatória' })
      .min(8, 'A senha deve ter no mínimo 8 caracteres'),
  }
}
