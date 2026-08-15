import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { ZodError } from 'zod'
import { AppError } from '#error/app_error'

export type ExceptionError = {
  messages: Array<string>
  statusCode: number
  code?: string
  trace?: string
  fullTrace?: string
}

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof AppError) {
      ctx.response.status(error.statusCode).send({
        messages: error.messages,
        status: error.statusCode,
        ...(error.code ? { code: error.code } : {}),
      })
      return
    }

    if (error instanceof ZodError) {
      ctx.response
        .status(422)
        .send({ messages: error.errors.map((err) => err.message), status: 422 })
      return
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
