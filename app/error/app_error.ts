import { type ExceptionError } from '#exceptions/handler'

export class AppError {
  public readonly messages: Array<string>
  public readonly statusCode: number
  public readonly code?: string
  public readonly trace?: any
  public readonly fullTrace?: any

  constructor(error: ExceptionError) {
    this.messages = error.messages
    this.statusCode = error.statusCode
    this.code = error.code
    this.trace = error.trace
    this.fullTrace = error.fullTrace
  }
}
