import { type BaseService } from '#services/base_service'
import { type HttpContext } from '@adonisjs/core/http'
import { AppError } from '#error/app_error'
import { ZodError } from 'zod'

export abstract class BaseController<TService extends BaseService<any, any>> {
  protected constructor(protected service: TService) {}

  private handleZodError(error: ZodError, response: HttpContext['response']) {
    const formattedErrors = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }))

    return response.status(422).json({
      messages: formattedErrors.map((err) => `${err.field}: ${err.message}`),
      errors: formattedErrors,
      status: 422,
      type: 'ValidationError',
    })
  }

  private handleDuplicateKeyError(error: Error, response: HttpContext['response']) {
    const constraintMatch = error.message.match(/constraint "(\w+)"/)
    const detailMatch = error.message.match(/Key \(([^)]+)\)/)

    let duplicatedField = 'não identificado'

    if (detailMatch && detailMatch[1]) {
      duplicatedField = detailMatch[1]
    } else if (constraintMatch && constraintMatch[1]) {
      const constraint = constraintMatch[1]
      const parts = constraint.split('_')
      if (parts.length > 2) {
        duplicatedField = parts.slice(1, -1).join('_')
      }
    }

    return response.status(409).json({
      messages: [
        `Já existe um registro em ${this.service.getEntityName()} com os dados informados`,
        `Campo duplicado: ${duplicatedField}`,
      ],
      status: 409,
      type: 'DuplicateError',
      field: duplicatedField,
      errorDetail: error.message,
    })
  }

  private handleForeignKeyError(error: any, response: HttpContext['response']) {
    const detailMatch =
      error.detail?.match(/Key \(([^)]+)\)/) || error.message.match(/Key \(([^)]+)\)/)
    const constraintMatch = error.message.match(/constraint "(\w+)"/)

    let field = 'referência'

    if (detailMatch && detailMatch[1]) {
      field = detailMatch[1]
    } else if (constraintMatch && constraintMatch[1]) {
      const constraint = constraintMatch[1]
      const parts = constraint.split('_')
      if (parts.length > 2) {
        field = parts.slice(1, -1).join('_')
      }
    }

    return response.status(422).json({
      messages: [
        `O registro informado no campo '${field}' não foi encontrado no sistema. Verifique os dados e tente novamente.`,
      ],
      status: 422,
      type: 'ForeignKeyError',
      field: field,
      errorDetail: error.message,
    })
  }

  private handleGenericError(error: any, response: HttpContext['response'], action: string) {
    console.error(`Erro ao ${action} ${this.service.getEntityName()}:`, error)
    return response.status(500).json({
      messages: [`Erro ao ${action} ${this.service.getEntityName()}`],
      status: 500,
      type: 'AppError',
    })
  }

  async index(ctx: HttpContext) {
    const { response, request } = ctx
    try {
      const { page, limit, order, search, ...filters } = request.qs()
      const data = await this.service.index({ page, limit, filters, order, search, ctx })
      return response.status(200).json(data)
    } catch (error) {
      if (error instanceof AppError) throw error
      if (error instanceof ZodError) return this.handleZodError(error, response)
      return this.handleGenericError(error, response, 'listar')
    }
  }

  async show(ctx: HttpContext) {
    const { request, response } = ctx
    try {
      const { id } = request.params()
      const data = await this.service.show({ id, ctx })
      return response.status(200).json({ data })
    } catch (error) {
      if (error instanceof AppError) throw error
      return this.handleGenericError(error, response, 'buscar')
    }
  }

  async store(ctx: HttpContext) {
    const { response, request } = ctx
    try {
      const data = request.body()
      const created = await this.service.store({ data, ctx })

      return response
        .status(201)
        .json({ data: created, message: `${this.service.getEntityName()} criado(a) com sucesso` })
    } catch (error) {
      if (error instanceof AppError) throw error
      if (error instanceof ZodError) return this.handleZodError(error, response)
      if (
        error instanceof Error &&
        error.message.includes('duplicate key value violates unique constraint')
      ) {
        return this.handleDuplicateKeyError(error, response)
      }
      if (error instanceof Error && error.message.includes('violates foreign key constraint')) {
        return this.handleForeignKeyError(error, response)
      }
      return this.handleGenericError(error, response, 'criar')
    }
  }

  async update(ctx: HttpContext) {
    const { request, response } = ctx
    try {
      const { id } = request.params()
      const data = request.body()

      const updatedData = await this.service.update({ id, data, ctx })

      return response.status(200).json({
        data: updatedData,
        message: `${this.service.getEntityName()} atualizado(a) com sucesso`,
      })
    } catch (error) {
      if (error instanceof AppError) throw error
      if (error instanceof ZodError) return this.handleZodError(error, response)
      if (
        error instanceof Error &&
        error.message.includes('duplicate key value violates unique constraint')
      ) {
        return this.handleDuplicateKeyError(error, response)
      }
      if (error instanceof Error && error.message.includes('violates foreign key constraint')) {
        return this.handleForeignKeyError(error, response)
      }
      return this.handleGenericError(error, response, 'atualizar')
    }
  }

  async destroy(ctx: HttpContext) {
    const { request, response } = ctx
    try {
      const { id } = request.params()
      const deletedEntity = await this.service.destroy({ id, ctx })

      return response.status(200).json({
        message: `${this.service.getEntityName()} deletado(a) com sucesso`,
        data: deletedEntity,
      })
    } catch (error) {
      if (error instanceof AppError) throw error
      return this.handleGenericError(error, response, 'deletar')
    }
  }
}
