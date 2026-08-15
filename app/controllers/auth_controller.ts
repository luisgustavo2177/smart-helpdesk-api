import type { HttpContext } from '@adonisjs/core/http'
import { ZodError } from 'zod'
import { AppError } from '#error/app_error'
import { AuthService } from '#services/auth_service'
import User from '#models/user'
import RegisterValidator from '#validators/register_validator'
import LoginValidator from '#validators/login_validator'

const registerValidator = new RegisterValidator()
const loginValidator = new LoginValidator()

export default class AuthController {
  /**
   * Cadastro público — sempre cria um REQUESTER (o campo `role` não existe
   * no RegisterValidator, então não há como o cliente se auto-promover a
   * ADMIN por aqui).
   */
  async register(ctx: HttpContext) {
    const { request, response } = ctx
    try {
      const data = registerValidator.validateCreate(request.body())

      const user = await User.create({ ...data, role: 'REQUESTER' })
      const token = AuthService.generateToken(user)

      return response.status(201).json({
        data: user,
        token,
        message: 'Cadastro realizado com sucesso',
      })
    } catch (error) {
      if (error instanceof AppError) throw error
      if (error instanceof ZodError) {
        return response.status(422).json({
          messages: error.errors.map((err) => err.message),
          status: 422,
        })
      }
      if (
        error instanceof Error &&
        error.message.includes('duplicate key value violates unique constraint')
      ) {
        return response.status(409).json({
          messages: ['Já existe um usuário cadastrado com este e-mail'],
          status: 409,
        })
      }
      console.error('Erro no cadastro:', error)
      return response.status(500).json({ messages: ['Erro ao cadastrar usuário'], status: 500 })
    }
  }

  async login(ctx: HttpContext) {
    const { request, response } = ctx
    try {
      const { email, password } = loginValidator.validateCreate(request.body())
      const { user, token } = await AuthService.login(email, password)

      return response.status(200).json({ data: user, token })
    } catch (error) {
      if (error instanceof AppError) throw error
      if (error instanceof ZodError) {
        return response.status(422).json({
          messages: error.errors.map((err) => err.message),
          status: 422,
        })
      }
      console.error('Erro no login:', error)
      return response.status(500).json({ messages: ['Erro ao autenticar'], status: 500 })
    }
  }

  /** Retorna o usuário autenticado — usada para validar que o token funciona. */
  async me(ctx: HttpContext) {
    return ctx.response.status(200).json({ data: ctx.user })
  }
}
