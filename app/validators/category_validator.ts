import z from 'zod'
import { BaseValidator } from './base_validator.js'

type CategoryValidatorShape = {
  name: z.ZodString
  status: z.ZodDefault<z.ZodBoolean>
}

export default class CategoryValidator extends BaseValidator<CategoryValidatorShape> {
  protected schema: CategoryValidatorShape = {
    name: z.string({ message: 'O nome é obrigatório' }).min(2, 'Deve ter no mínimo 2 caracteres'),
    status: z.boolean().default(true),
  }
}
