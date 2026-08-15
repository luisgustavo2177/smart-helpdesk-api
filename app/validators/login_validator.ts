import z from 'zod'
import { BaseValidator } from './base_validator.js'

type LoginValidatorShape = {
  email: z.ZodString
  password: z.ZodString
}

export default class LoginValidator extends BaseValidator<LoginValidatorShape> {
  protected schema: LoginValidatorShape = {
    email: z.string({ message: 'O e-mail é obrigatório' }).email('E-mail inválido'),
    password: z.string({ message: 'A senha é obrigatória' }).min(1, 'A senha é obrigatória'),
  }
}
