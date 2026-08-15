import type { HttpContext } from '@adonisjs/core/http'
import { AppError } from '#error/app_error'
import UserService from '#services/user_service'
import { BaseController } from './base_controller.js'

export default class UserController extends BaseController<UserService> {
  constructor() {
    super(new UserService())
  }

  async index(ctx: HttpContext) {
    if (await ctx.bouncer.with('UserPolicy').denies('viewList')) {
      throw new AppError({
        messages: ['Você não tem permissão para listar usuários.'],
        statusCode: 403,
      })
    }
    return super.index(ctx)
  }

  async show(ctx: HttpContext) {
    const { request, response } = ctx
    try {
      const { id } = request.params()
      const target = await this.service.show({ id })

      if (await ctx.bouncer.with('UserPolicy').denies('view', target)) {
        throw new AppError({
          messages: ['Você não tem permissão para ver este usuário.'],
          statusCode: 403,
        })
      }

      return response.status(200).json({ data: target })
    } catch (error) {
      if (error instanceof AppError) throw error
      return this.handleGenericError(error, response, 'buscar')
    }
  }

  async update(ctx: HttpContext) {
    const { request, response } = ctx
    try {
      const { id } = request.params()
      const target = await this.service.show({ id })

      if (await ctx.bouncer.with('UserPolicy').denies('update', target)) {
        throw new AppError({
          messages: ['Você não tem permissão para atualizar este usuário.'],
          statusCode: 403,
        })
      }

      // Só ADMIN pode alterar o papel de um usuário — evita que o próprio
      // usuário se auto-promova ao atualizar o próprio registro.
      if (ctx.user?.role !== 'ADMIN' && 'role' in request.body()) {
        throw new AppError({
          messages: ['Você não tem permissão para alterar o papel do usuário.'],
          statusCode: 403,
        })
      }

      return await super.update(ctx)
    } catch (error) {
      if (error instanceof AppError) throw error
      return this.handleGenericError(error, response, 'atualizar')
    }
  }

  async destroy(ctx: HttpContext) {
    const { request, response } = ctx
    try {
      const { id } = request.params()
      const target = await this.service.show({ id })

      if (await ctx.bouncer.with('UserPolicy').denies('delete', target)) {
        throw new AppError({
          messages: ['Você não tem permissão para remover este usuário.'],
          statusCode: 403,
        })
      }

      return await super.destroy(ctx)
    } catch (error) {
      if (error instanceof AppError) throw error
      return this.handleGenericError(error, response, 'deletar')
    }
  }
}
