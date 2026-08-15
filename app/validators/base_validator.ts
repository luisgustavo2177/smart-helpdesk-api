import { z } from 'zod'

export abstract class BaseValidator<T extends z.ZodRawShape> {
  protected abstract schema: T

  private getBaseSchema() {
    return z.object(this.schema)
  }

  protected get createSchema() {
    return this.getBaseSchema()
  }

  protected get updateSchema() {
    return this.getBaseSchema().partial()
  }

  protected get patchSchema() {
    return this.getBaseSchema().partial()
  }

  validateCreate(data: unknown): z.infer<z.ZodObject<T>> {
    return this.createSchema.parse(data)
  }

  validateUpdate(data: unknown): Partial<z.infer<z.ZodObject<T>>> {
    return this.updateSchema.parse(data)
  }

  validatePatch(data: unknown): Partial<z.infer<z.ZodObject<T>>> {
    return this.patchSchema.parse(data)
  }
}
