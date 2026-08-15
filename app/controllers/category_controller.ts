import type { HttpContext } from '@adonisjs/core/http'
import { AppError } from '#error/app_error'
import CategoryService from '#services/category_service'
import { BaseController } from './base_controller.js'

export default class CategoryController extends BaseController<CategoryService> {
  constructor() {
    super(new CategoryService())
  }

  private async assertCanManage(ctx: HttpContext) {
    if (await ctx.bouncer.with('CategoryPolicy').denies('manage')) {
      throw new AppError({
        messages: ['Apenas ADMIN pode gerenciar categorias.'],
        statusCode: 403,
      })
    }
  }

  async store(ctx: HttpContext) {
    await this.assertCanManage(ctx)
    return super.store(ctx)
  }

  async update(ctx: HttpContext) {
    await this.assertCanManage(ctx)
    return super.update(ctx)
  }

  async destroy(ctx: HttpContext) {
    await this.assertCanManage(ctx)
    return super.destroy(ctx)
  }
}
