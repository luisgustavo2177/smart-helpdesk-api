import jwt from 'jsonwebtoken'
import hash from '@adonisjs/core/services/hash'
import env from '#start/env'
import User from '#models/user'
import { AppError } from '#error/app_error'

export type JwtPayload = {
  sub: number
  role: 'ADMIN' | 'REQUESTER'
}

export class AuthService {
  static generateToken(user: User): string {
    const payload: JwtPayload = { sub: user.id, role: user.role }
    return jwt.sign(payload, env.get('SECRET_JWT'), {
      expiresIn: env.get('JWT_EXPIRES_IN'),
    } as jwt.SignOptions)
  }

  static verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.get('SECRET_JWT')) as unknown as JwtPayload
    } catch {
      throw new AppError({
        messages: ['Token inválido ou expirado. Por favor, autentique-se novamente.'],
        statusCode: 401,
      })
    }
  }

  static async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await User.findBy('email', email)

    if (!user || !(await hash.verify(user.password, password))) {
      throw new AppError({
        messages: ['E-mail ou senha inválidos.'],
        statusCode: 401,
      })
    }

    return { user, token: this.generateToken(user) }
  }
}
