import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { AppError } from '#error/app_error'
import { AuthService } from '#services/auth_service'
import User from '#models/user'

export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const token = ctx.request.header('Authorization')?.replace('Bearer ', '')

    if (!token) {
      throw new AppError({
        messages: ['Token de autenticação não fornecido.'],
        statusCode: 401,
      })
    }

    const payload = AuthService.verifyToken(token)

    const user = await User.find(payload.sub)
    if (!user) {
      throw new AppError({
        messages: ['Token inválido ou expirado. Por favor, autentique-se novamente.'],
        statusCode: 401,
      })
    }

    ctx.user = user

    return next()
  }
}
